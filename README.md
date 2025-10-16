# 3x-ui API Client

Полнофункциональный TypeScript клиент для работы с API панели управления 3x-ui. Поддерживает все основные операции: управление inbound подключениями, клиентами, подписками и многое другое.

## ⭐ Особенности

- 🚀 **Полная поддержка 3x-ui API** - все endpoints покрыты
- 🛡️ **Надежность** - встроенные retry механизмы, circuit breaker, обработка ошибок
- 📝 **TypeScript** - полная типизация для лучшего DX
- 🔄 **Подписки (Sub)** - управление клиентами с одинаковым subId
- 📊 **Массовые операции** - создание клиентов на всех inbound сразу
- 🔐 **Автоматическая аутентификация** - управление сессиями
- 🎯 **Современный стек** - Bun runtime + ES modules

## 🚀 Установка

```bash
# С помощью bun
bun add 3xui-api-client

# С помощью npm
npm install 3xui-api-client

# С помощью yarn
yarn add 3xui-api-client
```

## 📖 Быстрый старт

```typescript
import { createClient } from '3xui-api-client';

const xui = createClient({
  baseUrl: 'https://your-3xui-panel.com',
  username: 'admin',
  password: 'your-password'
});

// Подключение и аутентификация
await xui.login();

// Получить все inbound подключения
const inbounds = await xui.inbounds.getList();

// Получить все подписки
const subscriptions = await xui.clients.getAllSubscriptions();

// Создать клиента на всех inbound с одним subId (автогенерация)
await xui.createUniversalClient({
  limitIp: 2,
  traffic: { size: 50, unit: 'GB' },
  expiryDays: 30
});

// Или с конкретным subId
await xui.createUniversalClient({
  subId: 'company-user-123',
  limitIp: 3,
  traffic: { size: 100, unit: 'GB' },
  expiryDays: 60
});

// ✅ Результат: 4 клиента с одной подпиской
// - 8s884159@x.ui (subId: company-user-123)
// - m7k3p9x2@x.ui (subId: company-user-123)  
// - 5q2w8e7r@x.ui (subId: company-user-123)
// - z1x4c6v8@x.ui (subId: company-user-123)
```

## 🔧 Конфигурация

```typescript
interface ClientConfig {
  baseUrl: string;        // URL вашей 3x-ui панели
  username: string;       // Логин админа
  password: string;       // Пароль админа
  timeout?: number;       // Таймаут запросов (по умолчанию: 30000мс)
  retryAttempts?: number; // Количество повторов (по умолчанию: 3)
  retryDelay?: number;    // Задержка между повторами (по умолчанию: 1000мс)
}
```

## 📚 API Документация

### Управление Inbound подключениями

```typescript
// Получить все inbound
const inbounds = await xui.inbounds.getList();

// Получить конкретный inbound
const inbound = await xui.inbounds.getById(1);

// Создать новый inbound
await xui.inbounds.add({
  remark: 'My VLESS Inbound',
  enable: true,
  port: 8080,
  protocol: 'vless',
  settings: { clients: [], decryption: 'none' },
  streamSettings: {
    network: 'ws',
    security: 'none',
    wsSettings: { path: '/vless-ws' }
  },
  // ... другие настройки
});

// Обновить inbound
await xui.inbounds.update(1, { enable: false });

// Удалить inbound
await xui.inbounds.delete(1);

// Найти inbound по порту
const inbound = await xui.inbounds.findByPort(8080);

// Получить статистику
const summary = await xui.inbounds.getSummary();
```

### Управление клиентами

```typescript
// Получить клиентов из inbound
const clients = await xui.clients.getClientsFromInbound(1);

// Добавить клиента
await xui.clients.addClient(1, {
  id: 'uuid-here',
  email: 'user@example.com',
  enable: true,
  limitIp: 2,
  totalGB: 50 * 1024 * 1024 * 1024
});

// Обновить клиента
await xui.clients.updateClient(1, 'client-id', {
  enable: false
});

// Удалить клиента
await xui.clients.deleteClient(1, 'client-id');

// Получить трафик клиента
const traffic = await xui.clients.getClientTraffic('user@example.com');

// Сбросить трафик
await xui.clients.resetClientTraffic(1, 'user@example.com');
```

### 🔄 Работа с подписками (Sub)

Одна из ключевых фишек - управление клиентами с одинаковым `subId`:

```typescript
// Получить все подписки
const subscriptions = await xui.clients.getAllSubscriptions();

// Каждая подписка содержит:
subscriptions.forEach(sub => {
  console.log(`SubId: ${sub.subId}`);
  console.log(`Clients: ${sub.clients.length}`);
  
  sub.clients.forEach(clientInfo => {
    console.log(`  - ${clientInfo.client.email}`);
    console.log(`    Inbound: ${clientInfo.inboundRemark}`);
    console.log(`    Protocol: ${clientInfo.inboundProtocol}`);
  });
});

// Получить конкретную подписку
const subscription = await xui.clients.getSubscriptionById('sub-123');
```

### 🚀 Массовое создание клиентов

Создать клиента с одним `subId` на всех inbound подключениях:

```typescript
const result = await xui.clients.createClientOnAllInbounds({
  subId: 'universal-sub-123',
  email: 'user@example.com',  // Базовый email
  enable: true,
  limitIp: 2,
  totalGB: 100 * 1024 * 1024 * 1024, // 100 GB
  expiryTime: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 дней
  
  // Настройки для разных протоколов
  vmess: { alterId: 0, security: 'auto' },
  vless: { flow: 'xtls-rprx-vision' },
  trojan: { password: 'custom-password' },
  shadowsocks: { method: 'aes-256-gcm' }
});

console.log(`Создано: ${result.success}, Ошибок: ${result.failed}`);

// Результат: каждый inbound получит уникальный email:
// - user-grpc@example.com на gRPC inbound  
// - user-websocket@example.com на WebSocket inbound
// - user-xhttp@example.com на XHTTP inbound
// Но все с одним subId: 'universal-sub-123'
```

**⚠️ Важно:** Поскольку в 3x-ui email клиента должен быть уникальным, система автоматически генерирует короткие случайные email (формат: `8символов@x.ui`) для каждого inbound, но сохраняет один `subId` для всей подписки. UUID для подключения к прокси генерируется как настоящий v4 UUID.

**🔧 VLESS Flow:** Система автоматически определяет правильный `flow` для VLESS клиентов на основе настроек inbound'а:
- **XTLS**: `flow = "xtls-rprx-vision"`
- **TLS/Reality/None**: `flow = ""` (пустой)
- Это устраняет ошибки *"client flow is empty"* в XRAY логах.

**🆔 SubId Генерация:** Если `subId` не указан, система автоматически генерирует UUID один раз для всей подписки (не для каждого клиента отдельно), обеспечивая правильную группировку в `getAllSubscriptions()`.

## 🎯 Новые возможности API v2

### 🔧 Гибкие параметры

```typescript
// Автогенерация всех параметров
await xui.createUniversalClient(); // Минимальная конфигурация

// Неограниченные параметры  
await xui.createUniversalClient({
  limitIp: 'unlimited',      // Без лимита устройств
  traffic: 'unlimited',      // Без лимита трафика
  expiryDays: 'unlimited'    // Без срока истечения
});

// Различные размеры трафика
await xui.createUniversalClient({
  traffic: { size: 500, unit: 'MB' }  // 500 МБ
});
await xui.createUniversalClient({  
  traffic: { size: 50, unit: 'GB' }   // 50 ГБ
});
await xui.createUniversalClient({
  traffic: { size: 2, unit: 'TB' }    // 2 ТБ
});
```

### 🆔 Короткие email

```typescript
// Автогенерация subId и коротких email
const result = await xui.createUniversalClient();

// Создает клиентов вида:
// - 8s884159@x.ui (subId: автогенерированный UUID)
// - m7k3p9x2@x.ui (subId: автогенерированный UUID)
// - 5q2w8e7r@x.ui (subId: автогенерированный UUID)
// Все с одним subId для подписки

// Конкретный subId
await xui.createUniversalClient({
  subId: 'premium-user-001'
});
```

### 📊 Тарифные планы

```typescript
// Базовый тариф
await xui.createUniversalClient({
  subId: 'basic-user-001',
  limitIp: 1,
  traffic: { size: 10, unit: 'GB' },
  expiryDays: 30
});

// Премиум тариф  
await xui.createUniversalClient({
  subId: 'premium-user-001',
  limitIp: 5,
  traffic: { size: 100, unit: 'GB' },
  expiryDays: 30
});

// Корпоративный тариф
await xui.createUniversalClient({
  subId: 'corp-user-001',
  limitIp: 'unlimited',
  traffic: 'unlimited', 
  expiryDays: 365
});
```

Или создать только на определенных inbound:

```typescript
const result = await xui.clients.createClientOnInbounds(clientRequest, [1, 2, 3]);
```

### 🗑️ Массовое удаление

```typescript
// Удалить всех клиентов с определенным subId
const result = await xui.clients.deleteClientsBySubId('sub-123');
```

### 📊 Системная информация

```typescript
// Полный обзор системы
const overview = await xui.getSystemOverview();

console.log('Inbounds:', overview.inbounds);
console.log('Online users:', overview.onlineUsers.length);
console.log('Subscriptions:', overview.subscriptions.length);
console.log('Auth status:', overview.auth);
```

## 🛡️ Обработка ошибок

Клиент использует специализированные типы ошибок:

```typescript
import { 
  ApiError, 
  AuthenticationError, 
  NetworkError, 
  ValidationError 
} from '3xui-api-client';

try {
  await xui.inbounds.getList();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Проблемы с аутентификацией');
  } else if (error instanceof NetworkError) {
    console.log('Сетевая ошибка');
  } else if (error instanceof ValidationError) {
    console.log('Ошибка валидации:', error.field);
  }
}
```

## 🔄 Circuit Breaker

Встроенный circuit breaker защищает от перегрузки API:

```typescript
const status = xui.getCircuitBreakerStatus();
console.log('Circuit breaker:', status);
// { failures: 0, isOpen: false, nextAttempt: undefined }
```

## 📝 Примеры

### Полный пример работы с подписками

```typescript
import { createClient } from '3xui-api-client';

async function manageSubscriptions() {
  const xui = createClient({
    baseUrl: 'https://your-panel.com',
    username: 'admin',
    password: 'password'
  });

  await xui.login();

  // 1. Создать универсального клиента
  const subId = `user-${Date.now()}`;
  const email = `user-${Date.now()}@example.com`;
  
  const result = await xui.createUniversalClient(subId, email, {
    limitIp: 2,
    totalGB: 50,
    expiryDays: 30
  });

  console.log(`Клиент создан на ${result.success} inbound подключениях`);

  // 2. Проверить созданную подписку
  const subscription = await xui.clients.getSubscriptionById(subId);
  if (subscription) {
    console.log(`Подписка содержит ${subscription.clients.length} клиентов`);
  }

  // 3. Получить статистику
  const overview = await xui.getSystemOverview();
  console.log(`Всего подписок: ${overview.subscriptions.length}`);

  xui.logout();
}
```

### Миграция клиентов

```typescript
// Перенести всех клиентов с одного subId на другой
async function migrateSubscription(oldSubId: string, newSubId: string) {
  const oldSubscription = await xui.clients.getSubscriptionById(oldSubId);
  
  if (oldSubscription && oldSubscription.clients.length > 0) {
    const client = oldSubscription.clients[0].client;
    
    // Создать с новым subId
    await xui.clients.createClientOnAllInbounds({
      subId: newSubId,
      email: client.email,
      enable: client.enable,
      limitIp: client.limitIp,
      totalGB: client.totalGB,
      expiryTime: client.expiryTime
    });

    // Удалить старую подписку
    await xui.clients.deleteClientsBySubId(oldSubId);
  }
}
```

## 🔧 Разработка

```bash
# Клонировать репозиторий
git clone https://github.com/yourusername/3xui-api-client.git
cd 3xui-api-client

# Установить зависимости
bun install

# Запустить примеры
bun run examples/basic-usage.ts
bun run examples/subscription-examples.ts

# Сборка
bun run build
```

## 📄 Лицензия

MIT

## 🤝 Поддержка

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/3xui-api-client/issues)
- 📚 Wiki: [GitHub Wiki](https://github.com/yourusername/3xui-api-client/wiki)

## 🔗 Связанные проекты

- [3x-ui](https://github.com/MHSanaei/3x-ui) - Основная панель управления
- [3x-ui Wiki](https://github.com/MHSanaei/3x-ui/wiki/Configuration#api) - Документация API
