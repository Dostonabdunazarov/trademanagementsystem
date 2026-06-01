# Code Review — Найденные баги и проблемы

Дата: 2026-06-01  
Scope: uncommitted working-tree changes (audit logging + account lockout)

---

## 🔴 Критические

### 1. Singleton захватывает Scoped `IAuditLogger`
**Файл:** `TradeMS/TradeMS.Api/Infrastructure/GlobalExceptionHandler.cs:9`

`AddExceptionHandler<GlobalExceptionHandler>()` регистрирует хендлер как **Singleton**, а `IAuditLogger` зарегистрирован как `AddScoped`. Инъекция Scoped-сервиса в Singleton — captive dependency.

- **Development:** ASP.NET Core scope validation бросает `InvalidOperationException` при старте.
- **Production:** тихая порча EF change-tracker и утечка DB-соединений между запросами.

**Фикс:**
```csharp
// Program.cs — заменить:
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// На:
builder.Services.AddScoped<GlobalExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
// или разрешать IAuditLogger через IServiceProvider внутри TryHandleAsync, а не через конструктор
```

---

### 2. `auditLogger.LogAsync` без `try/catch` + отменённый `CancellationToken` в ExceptionHandler
**Файл:** `TradeMS/TradeMS.Api/Infrastructure/GlobalExceptionHandler.cs:29`

Два сценария краша самого exception handler'а:

1. **Клиент отключился** → `ct` уже отменён → `SaveChangesAsync(ct)` внутри `AuditLogger` бросает `OperationCanceledException` → HTTP-ответ никогда не записывается, клиент получает обрыв соединения.
2. **DB timeout** → `SaveChangesAsync` бросает → то же самое. `ctx.Response.StatusCode` и `WriteAsJsonAsync` стоят ПОСЛЕ `LogAsync`, поэтому ответ не отправляется.

**Фикс:**
```csharp
// GlobalExceptionHandler.cs
try
{
    await auditLogger.LogAsync(AuditActions.ErrorServer, success: false,
        errorMessage: ex.Message,
        cancellationToken: CancellationToken.None); // <-- не передавать ct
}
catch (Exception auditEx)
{
    logger.LogError(auditEx, "Audit log write failed");
}

ctx.Response.StatusCode = status;
await ctx.Response.WriteAsJsonAsync(...);
```

---

## 🟠 Серьёзные

### 3. `FailedLoginCount` не сбрасывается после истечения блокировки — немедленная повторная блокировка
**Файл:** `TradeMS/TradeMS.Application/Features/Auth/Commands/Login/LoginCommandHandler.cs:50`

После блокировки `FailedLoginCount = 5`. Когда `LockoutUntil` истекает и пользователь вводит неверный пароль:
- строка 50: `FailedLoginCount++` → 6
- строка 51: `6 >= 5` → `true` → немедленно устанавливается новый `LockoutUntil`

Пользователь блокируется с первой же попытки после истечения блокировки, а не после 5.

**Фикс:**
```csharp
if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
{
    // Сбросить счётчик, если предыдущая блокировка уже истекла
    if (user.LockoutUntil.HasValue && user.LockoutUntil <= DateTime.UtcNow)
    {
        user.FailedLoginCount = 0;
        user.LockoutUntil = null;
    }

    user.FailedLoginCount++;
    if (user.FailedLoginCount >= MaxFailedAttempts)
        user.LockoutUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
    // ...
}
```

---

### 4. Сброс состояния блокировки теряется если `jwtService` бросает исключение
**Файл:** `TradeMS/TradeMS.Application/Features/Auth/Commands/Login/LoginCommandHandler.cs:63`

После успешного BCrypt-verify:
1. `user.FailedLoginCount = 0` и `user.LockoutUntil = null` присваиваются в памяти.
2. Затем вызывается `jwtService.GenerateAccessToken(user)` — если тот бросит (например, отсутствует signing key).
3. `SaveChangesAsync` никогда не вызывается → сброс в БД не сохраняется.
4. На следующей попытке входа `FailedLoginCount` остаётся ≥ 5 → немедленная блокировка.

**Фикс:** вызывать `SaveChangesAsync` для сброса до вызовов `jwtService`, или обернуть токен-генерацию в try/catch.

---

## 🟡 Важные

### 5. N+1 запросы к БД в `ConfirmDocument`
**Файл:** `TradeMS/TradeMS.Application/Features/Documents/Commands/ConfirmDocument/ConfirmDocumentCommandHandler.cs:48`

Внутри цикла по строкам документа выполняется отдельный `FirstOrDefaultAsync` к таблице `Stocks` на каждую строку. Документ с N строками = N последовательных SELECT-запросов.

**Фикс:**
```csharp
// До цикла — один батчевый запрос:
var productIds = doc.Lines.Select(l => l.ProductId).ToList();
var stocks = await db.Stocks
    .Where(s => productIds.Contains(s.ProductId) && s.BranchId == doc.BranchId)
    .ToListAsync(cancellationToken);
var stockDict = stocks.ToDictionary(s => s.ProductId);

// В цикле:
stockDict.TryGetValue(line.ProductId, out var stock);
```

---

### 6. Неэкранированный JSON в audit log snapshots (10+ мест)
**Файлы:** все delete/create хендлеры — `DeleteBranch`, `DeleteAccount`, `DeleteCounterparty`, `DeleteProduct`, `DeleteDocument`, `CreateCounterparty`, `CreateProduct`, `CreateUser`, `ConfirmDocument`, `CreateDocument`, `UpdateUser`

Пример из `DeleteBranchCommandHandler.cs:19`:
```csharp
var snapshot = $"{{\"name\":\"{branch.Name}\"}}";
```

Если `branch.Name` содержит `"` или `\` — JSON невалидный:
- `Main "HQ"` → `{"name":"Main "HQ""}` — сломанный JSON
- `C:\Store` → `{"name":"C:\Store"}` — невалидный escape

**Фикс:** заменить на `System.Text.Json` (доступен из коробки в net10.0):
```csharp
var snapshot = JsonSerializer.Serialize(new { name = branch.Name });
```

---

### 7. `AuditLogger.LogAsync` вызывает `SaveChangesAsync` на общем DbContext
**Файл:** `TradeMS/TradeMS.Infrastructure/Services/AuditLogger.cs:36`

`AuditLogger` разделяет `IAppDbContext` с хендлерами. Если хендлер добавит tracked-изменения и до своего `SaveChangesAsync` вызовет `LogAsync` — аудит-логгер досрочно сохранит ВСЕ pending-изменения на DbContext, включая бизнес-данные. Текущий код избегает этого только за счёт порядка вызовов — хрупкая гарантия.

**Фикс:** либо не вызывать `SaveChangesAsync` внутри `LogAsync` (только `db.AuditLogs.Add`), либо использовать отдельный DbContext для аудита.

---

### 8. Лишний DB-запрос на Counterparty в `ConfirmDocument`
**Файл:** `TradeMS/TradeMS.Application/Features/Documents/Commands/ConfirmDocument/ConfirmDocumentCommandHandler.cs:89`

`doc.Counterparty` уже загружен через `.Include(d => d.Counterparty)` на строке 19, но на строке 89 выполняется повторный `FirstOrDefaultAsync` за той же записью для обновления баланса.

**Фикс:**
```csharp
// Вместо:
var cp = await db.Counterparties.FirstOrDefaultAsync(c => c.Id == doc.CounterpartyId.Value, ct);

// Использовать уже загруженный:
var cp = doc.Counterparty;
```

---

## Сводка

| # | Severity | Файл | Описание |
|---|----------|------|----------|
| 1 | 🔴 Критический | GlobalExceptionHandler.cs:9 | Singleton + Scoped DI captive dependency |
| 2 | 🔴 Критический | GlobalExceptionHandler.cs:29 | Unguarded LogAsync + cancelled CT crashes exception handler |
| 3 | 🟠 Серьёзный | LoginCommandHandler.cs:50 | FailedLoginCount не сбрасывается — немедленная повторная блокировка |
| 4 | 🟠 Серьёзный | LoginCommandHandler.cs:63 | Сброс блокировки теряется если jwtService бросает |
| 5 | 🟡 Важный | ConfirmDocumentCommandHandler.cs:48 | N+1 запросы к Stocks в цикле |
| 6 | 🟡 Важный | 10+ handlers | Неэкранированный JSON в snapshots |
| 7 | 🟡 Важный | AuditLogger.cs:36 | SaveChangesAsync на общем DbContext |
| 8 | 🟡 Важный | ConfirmDocumentCommandHandler.cs:89 | Лишний SELECT на Counterparty |
