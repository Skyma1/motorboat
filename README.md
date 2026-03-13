# MotorBoat — Система управления бизнесом прогулочных катеров

Полнофункциональная информационная система: кроссплатформенное мобильное приложение (Android + iOS) и веб-панель администратора.

## Архитектура

```
motorboat/
├── backend/          # Node.js + Express + TypeScript + Prisma + PostgreSQL
├── web/              # React + TypeScript + Vite + TailwindCSS (веб-панель)
├── mobile/           # React Native + Expo (мобильное приложение)
└── docker-compose.yml
```

## Стек технологий

| Компонент       | Технологии                                           |
|-----------------|------------------------------------------------------|
| Backend         | Node.js, Express, TypeScript, Prisma ORM             |
| База данных     | PostgreSQL 16                                        |
| Кэш/очереди     | Redis 7                                              |
| Веб-панель      | React 18, TypeScript, Vite, TailwindCSS, Shadcn/ui   |
| Мобильное       | React Native, Expo SDK 54, Expo Router               |
| Аутентификация  | JWT (access + refresh tokens)                        |
| Real-time       | Socket.io                                            |
| Планировщик     | node-cron (автозакрытие дня в 00:00)                 |
| Контейнеры      | Docker + docker-compose                              |

## Роли в системе

- **ADMIN** — полный доступ, управление пользователями, катерами, ставками, отчёты
- **DISPATCHER** — управление швартовкой, ставки капитанов, просмотр рейсов и балансов
- **CAPTAIN** — создание/запуск/завершение рейсов, хоз. расходы, подработки, заправка

## Быстрый старт (Docker)

### 1. Клонируйте репозиторий

```bash
git clone <repo-url>
cd motorboat
```

### 2. Настройте backend

```bash
cp backend/.env.example backend/.env
# Отредактируйте backend/.env и установите надёжный JWT_SECRET
```

### 3. Запустите через Docker Compose

```bash
docker-compose up -d
```

### 4. Примените миграции и заполните тестовыми данными

Backend при старте сам выполняет `prisma migrate deploy`. Если база пустая — миграции применятся автоматически. Seed нужно выполнить вручную:

```bash
docker exec motorboat_backend npm run db:seed
```

**Если backend циклически перезапускается** (ошибка P3009 «failed migrations»), значит в БД остались записи о неудачных миграциях. Для **свежего деплоя** (без важных данных):

```bash
docker-compose down -v
docker-compose up -d
# Подождите ~15 сек, пока backend применит миграции
docker exec motorboat_backend npm run db:seed
```

### 5. Откройте веб-панель

Веб-панель: [http://localhost:3000](http://localhost:3000)

**Тестовые учётные данные:**
- Администратор: `+79000000000` / `admin123`
- Диспетчер: `+79000000001` / `disp123`
- Капитан: `+79000000002` / `capt123`

## Разработка без Docker

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Backend доступен на `http://localhost:3001`

### Веб-панель

```bash
cd web
npm install
npm run dev
```

Веб-панель доступна на `http://localhost:3000`

### Мобильное приложение

```bash
cd mobile
npm install
cp .env.example .env
# Установите EXPO_PUBLIC_API_URL=http://<IP вашего сервера>:3001/api
npx expo start
```

Отсканируйте QR-код в приложении **Expo Go** (Android/iOS).

## API Endpoints

### Аутентификация
```
POST   /api/auth/login           — Вход
POST   /api/auth/refresh         — Обновление токена
GET    /api/auth/me              — Текущий пользователь
```

### Пользователи
```
GET    /api/users                — Все пользователи (Admin, Dispatcher)
GET    /api/users/captains       — Список капитанов
GET    /api/users/dispatchers    — Список диспетчеров
POST   /api/users                — Создать пользователя (Admin)
PUT    /api/users/:id            — Обновить пользователя (Admin)
DELETE /api/users/:id            — Деактивировать (Admin)
```

### Катера
```
GET    /api/boats                — Список катеров
POST   /api/boats                — Добавить катер (Admin)
PUT    /api/boats/:id            — Обновить катер (Admin, Dispatcher)
DELETE /api/boats/:id            — Деактивировать (Admin)
```

### Причалы
```
GET    /api/piers                — Список причалов
POST   /api/piers                — Добавить (Admin, Dispatcher)
PUT    /api/piers/:id            — Обновить (Admin, Dispatcher)
DELETE /api/piers/:id            — Деактивировать (Admin, Dispatcher)
```

### Рейсы
```
GET    /api/trips                — Список рейсов (с фильтрами)
GET    /api/trips/active         — Активные рейсы
GET    /api/trips/today          — Рейсы сегодня
GET    /api/trips/:id            — Детали рейса
POST   /api/trips                — Создать рейс без швартовки (Captain)
POST   /api/trips/:id/start      — Начать прогулку (Captain)
POST   /api/trips/:id/complete   — Завершить прогулку (Captain, только после швартовки)
PUT    /api/trips/:id/docking    — Заполнить/изменить швартовку (Admin, Dispatcher)
PUT    /api/trips/:id/reassign   — Переназначить (Admin, Dispatcher)
```

### Хозяйственные расходы
```
GET    /api/expenses             — Список расходов
POST   /api/expenses             — Добавить расход (Captain)
DELETE /api/expenses/:id         — Удалить расход
GET    /api/expenses/part-time   — Список подработок
POST   /api/expenses/part-time   — Добавить подработку (Captain)
DELETE /api/expenses/part-time/:id — Удалить подработку
GET    /api/expenses/fuel        — Список заправок
POST   /api/expenses/fuel        — Добавить заправку (Captain)
DELETE /api/expenses/fuel/:id    — Удалить заправку
```

### Ставки
```
GET    /api/rates/captains                       — Ставки капитанов
PUT    /api/rates/captains/:captainId            — Обновить ставку капитана
```

### Финансы
```
GET    /api/finance/daily-summary        — Финансовая сводка за день
GET    /api/finance/captain-balance/:id  — Баланс капитана
GET    /api/finance/balances             — Балансы всех капитанов
GET    /api/finance/reports              — Отчёт за период
GET    /api/finance/cash-handover/required — Проверка обязательной сдачи вчерашней налички (Captain)
POST   /api/finance/cash-handover          — Сохранить сдачу вчерашней налички (Captain)
PUT    /api/finance/cash-handover/:id      — Редактировать запись сдачи налички (Admin, Dispatcher)
POST   /api/finance/close-day           — Ручное закрытие дня (Admin)
```

## Бизнес-логика

### Расчёт зарплаты капитана

```
Зарплата за рейс = (Ставка ₽/час ÷ 60) × Длительность (мин)
Итоговая ЗП за день = MAX(Сумма ЗП за рейсы, Оплата за выход)
```

### Баланс наличных капитана

```
Баланс = Наличные от клиентов + Подработки - Итоговая ЗП - Хоз. расходы - Заправка

Баланс > 0 → Капитан сдаёт владельцу
Баланс < 0 → Бизнес переводит капитану на карту
Баланс = 0 → Расчёты совпадают
```

### Швартовка и обязательная сдача налички

- Швартовку заполняет только диспетчер (`PRIVATE`/`CITY`), капитан рейс создаёт без причала.
- Для `CITY` указывается причал и часы, `pierCost = cost(причала) × cityDockHours`.
- Рейс нельзя завершить без заполненной швартовки.
- Если вчерашний баланс капитана положительный, перед первым рейсом нового дня капитан обязан заполнить «кому сдал наличку».
- Диспетчер может редактировать запись сдачи налички.

### Автоматическое закрытие дня

Каждый день в 00:00 (по московскому времени) система автоматически:
- Фиксирует итоговый баланс каждого капитана
- Закрывает день (флаг `isClosed = true`)

## Переменные окружения (Backend)

| Переменная              | Описание                          | По умолчанию              |
|-------------------------|-----------------------------------|---------------------------|
| `DATABASE_URL`          | URL PostgreSQL                    | —                         |
| `REDIS_URL`             | URL Redis                         | —                         |
| `JWT_SECRET`            | Секрет для access токенов         | —                         |
| `JWT_REFRESH_SECRET`    | Секрет для refresh токенов        | —                         |
| `JWT_EXPIRES_IN`        | Срок действия access токена       | `1d`                      |
| `JWT_REFRESH_EXPIRES_IN`| Срок действия refresh токена      | `30d`                     |
| `PORT`                  | Порт сервера                      | `3001`                    |
| `TZ`                    | Временная зона                    | `Europe/Moscow`           |
| `CORS_ORIGIN`           | CORS origin для веб-панели        | `http://localhost:3000`   |

## Схема базы данных

```
users            — Пользователи (Admin, Dispatcher, Captain)
boats            — Катера
boat_captains    — Привязка катер-капитан
piers            — Причалы
captain_rates    — Ставки капитанов
trips            — Рейсы (ключевая сущность)
expenses         — Хозяйственные расходы
part_time_works  — Подработки капитанов
fuel_expenses    — Заправки капитанов
cash_handovers   — Записи «кому сдал наличку»
daily_balances   — Дневные балансы капитанов
```

## Сборка мобильного APK/IPA

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android  # APK для Android
eas build --platform ios      # IPA для iOS (нужен Apple Developer Account)
```

## Healthcheck

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"2026-03-05T..."}
```
