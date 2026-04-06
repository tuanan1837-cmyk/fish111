# Magic Ocean

This is a React + TypeScript app intended to run with Vite.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.

## GitHub

1. Create a new GitHub repository.
2. In this project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial Magic Ocean commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

## Vercel

1. Go to https://vercel.com and sign in.
2. Import the GitHub repository.
3. Set framework to `Vite` if asked.
4. Use `npm install` and `npm run build` as build settings.

## Supabase

Supabase is not required for static deployment, but if you want a backend/database:

1. Create a Supabase project at https://supabase.com.
2. Use Supabase settings or API keys in a `.env` file.
3. Add the `.env` values to Vercel environment variables.

## Notes

- If your `package.json` is missing, rename `package.json.template` to `package.json` in the project root so Vercel can build.
- Make sure `index.html`, `vite.config.ts`, and `tsconfig.json` are present in the root.
