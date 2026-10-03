# Lisa's Recipe Book

A Cajun and Texas cookbook for Lisa Miller. The pages live on Cloudflare. Accounts, notes, pictures, and films are kept by the Express server on this computer. The open recipe library comes from TheMealDB.

```bash
npm start
```

The book listens on port 4173. To publish it again, start Cloudflare's tunnel against that port and deploy the `public` folder to the `lisas-recipe-book` Pages project, with `config.js` pointing at the tunnel.
