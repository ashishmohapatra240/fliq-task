import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import preferenceRoutes from "./routes/preference.route.js";

const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: [
      "fliq-task.ashishmohapatra.in",
      "https://fliq-task.ashishmohapatra.in",
    ],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/preferences", preferenceRoutes);

app.listen(4001, () => {
  console.log("Server is running on port 4001");
});
