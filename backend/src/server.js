require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const retryRoutes =
  require(
    "./routes/retryRoutes"
  );
const connectDB =
  require("./config/db");

const authRoutes =
  require("./routes/authRoutes");

const jobRoutes =
  require("./routes/jobRoutes");

const testRoutes =
  require("./routes/testRoutes");

  const socketRoutes =
  require(
    "./routes/socketRoutes"
  );

const {
  initializeSocket
} = require(
  "./sockets/socket"
);

const app = express();

const server =
  http.createServer(app);

initializeSocket(server);

connectDB();

app.use(cors({
  origin:
    process.env.CORS_ORIGIN || "*"
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message:
      "AI Media Processing API Running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/retry", retryRoutes);
app.use("/api/test", testRoutes);
app.use(
  "/api/socket",
  socketRoutes
);

const uploadsDir =
  process.env.UPLOADS_DIR || "uploads";

app.use(
  "/uploads",
  express.static(uploadsDir)
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT =
  process.env.PORT || 5000;

const HOST =
  process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(
    `Server running on ${HOST}:${PORT}`
  );
});