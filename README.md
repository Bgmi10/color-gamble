# Color Game (free-to-play) — Next.js, Prisma, PostgreSQL, Tailwind, S3

Play-money color prediction game. Coins have no cash value: there is no deposit, withdrawal or payment code in this project.

## Features
- Phone-number OTP registration and login (APITXT SMS). OTPs are stored hashed, expire in 5 minutes, allow 5 attempts, 30 s resend cooldown.
- Game: 3 colors (Green / Violet / Red) on a lazy round engine (no cron). Each round publishes `sha256(seed)` up front and reveals the seed after settlement; the result is derived from the seed, so nobody (admin included) can choose outcomes.
- Wallet: signup bonus, bets, wins and admin adjustments all in a coin ledger visible to the player.
- Roles: **Admin** (everything incl. coin grants/deductions, roles, delete users, audit log), **Moderator** (view/suspend regular users, game settings, stats), **User** (play and own history).
- Admin: live dashboard (polls every 5 s, SVG charts), user management, game settings (round length, limits, payouts, banner uploaded to S3), audit log of every staff action.

## Run
```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed        # creates admin and moderator on SEED_*_PHONE numbers
npm run dev
```
Without `APITXT_API_KEY` in development the OTP is printed in the server console and shown on the login screen. Log in on the seeded admin number to reach `/admin`.

## Docker
```bash
cp .env.example .env && docker compose up --build
docker compose exec app npx prisma db seed
```

## S3
Set `S3_BUCKET`, `AWS_REGION`, keys. Bucket CORS must allow PUT from your site; `assets/*` must be publicly readable.

## Layout
`lib/game.ts` round engine and settlement · `lib/perm.ts` role permissions · `lib/auth.ts` session + route wrapper · `app/api/**` REST routes · `components/` UI.

## Not included
Real-money payments or withdrawals. Online real-money gaming is prohibited in India under the Promotion and Regulation of Online Gaming Act, 2025, so this project is deliberately play-money only.
