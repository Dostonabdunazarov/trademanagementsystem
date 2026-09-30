FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY TradeMS.Api/TradeMS.Api.csproj TradeMS.Api/
COPY TradeMS.Application/TradeMS.Application.csproj TradeMS.Application/
COPY TradeMS.Domain/TradeMS.Domain.csproj TradeMS.Domain/
COPY TradeMS.Infrastructure/TradeMS.Infrastructure.csproj TradeMS.Infrastructure/
RUN dotnet restore TradeMS.Api/TradeMS.Api.csproj

COPY . .
RUN dotnet publish TradeMS.Api/TradeMS.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
# Непривилегированный пользователь из базового образа (UID 1654); порт 8080 > 1024, root не нужен.
USER $APP_UID
ENTRYPOINT ["dotnet", "TradeMS.Api.dll"]
