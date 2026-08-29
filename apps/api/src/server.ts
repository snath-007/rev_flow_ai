import app from "./index.js";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

app.listen(port, () => {
  console.log(`RevFlow API listening on http://localhost:${port}`);
});
