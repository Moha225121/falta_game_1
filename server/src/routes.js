import express from "express";
import { GAME_MODES } from "./gameModes.js";

function requireAdmin(config) {
  return (req, res, next) => {
    if (!config.adminToken) {
      res.status(503).json({ error: "رمز الإدارة غير مضبوط على الخادم." });
      return;
    }

    const expected = `Bearer ${config.adminToken}`;
    if (req.headers.authorization !== expected) {
      res.status(401).json({ error: "رمز الإدارة مطلوب." });
      return;
    }

    next();
  };
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createApiRouter({ store, game, config }) {
  const router = express.Router();
  const adminOnly = requireAdmin(config);

  router.get("/health", (req, res) => {
    res.json({
      ok: true,
      name: "واجهة فلتة البرمجية",
      time: new Date().toISOString()
    });
  });

  router.get("/config", (req, res) => {
    res.json({
      adminAuthRequired: true,
      adminConfigured: Boolean(config.adminToken),
      minPlayers: config.minPlayers,
      maxPlayers: config.maxPlayers,
      answerSeconds: config.answerSeconds,
      voteSeconds: config.voteSeconds
    });
  });

  router.get("/categories", asyncRoute(async (req, res) => {
    res.json(await store.categories());
  }));

  router.get("/game-modes", (req, res) => {
    res.json(GAME_MODES);
  });

  router.get("/stats", adminOnly, asyncRoute(async (req, res) => {
    res.json(await store.stats());
  }));

  router.get("/questions", adminOnly, asyncRoute(async (req, res) => {
    res.json(await store.list(req.query));
  }));

  router.get("/questions/:id", adminOnly, asyncRoute(async (req, res) => {
    const question = await store.get(req.params.id);
    if (!question) {
      res.status(404).json({ error: "السؤال غير موجود." });
      return;
    }
    res.json(question);
  }));

  router.post("/questions", adminOnly, asyncRoute(async (req, res) => {
    const question = await store.create(req.body);
    res.status(201).json(question);
  }));

  router.put("/questions/:id", adminOnly, asyncRoute(async (req, res) => {
    const question = await store.update(req.params.id, req.body);
    if (!question) {
      res.status(404).json({ error: "السؤال غير موجود." });
      return;
    }
    res.json(question);
  }));

  router.delete("/questions/:id", adminOnly, asyncRoute(async (req, res) => {
    const deleted = await store.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "السؤال غير موجود." });
      return;
    }
    res.status(204).end();
  }));

  router.get("/rooms/:code", (req, res) => {
    const room = game.getRoom(req.params.code);
    if (!room) {
      res.status(404).json({ error: "الغرفة غير موجودة." });
      return;
    }
    res.json(room);
  });

  router.use((err, req, res, next) => {
    if (err.name === "ZodError") {
      res.status(400).json({ error: "فشل التحقق من البيانات.", details: err.flatten() });
      return;
    }

    next(err);
  });

  return router;
}
