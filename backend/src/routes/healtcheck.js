import express from "express";
const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is healthy and running" });
});

export default router;
