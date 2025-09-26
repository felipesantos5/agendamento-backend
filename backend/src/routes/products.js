import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import {
  requireRole,
  protectAdmin,
} from "../middleware/authAdminMiddleware.js";

const router = express.Router({ mergeParams: true });

// GET /api/barbershops/:barbershopId/products - Listar produtos
router.get("/", protectAdmin, async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const {
      category,
      status = "ativo",
      lowStock,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { barbershop: barbershopId };

    // Filtros
    if (category && category !== "all") {
      query.category = category;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    let products = await Product.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filtro de baixo estoque (aplicado após a consulta)
    if (lowStock === "true") {
      products = products.filter((product) => product.isLowStock);
    }

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/barbershops/:barbershopId/products/:productId - Buscar produto específico
router.get("/:productId", protectAdmin, async (req, res) => {
  try {
    const { barbershopId, productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      barbershop: barbershopId,
    });

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/barbershops/:barbershopId/products - Criar produto
router.post("/", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId } = req.params;

    const productData = {
      ...req.body,
      barbershop: barbershopId,
    };

    const product = new Product(productData);
    await product.save();

    // Registrar movimentação inicial se houver estoque
    if (product.stock.current > 0) {
      const stockMovement = new StockMovement({
        product: product._id,
        type: "entrada",
        quantity: product.stock.current,
        reason: "Estoque inicial",
        previousStock: 0,
        newStock: product.stock.current,
        unitCost: product.price.purchase,
        totalCost: product.price.purchase * product.stock.current,
        barbershop: barbershopId,
        notes: "Cadastro inicial do produto",
      });
      await stockMovement.save();
    }

    const populatedProduct = await Product.findById(product._id);

    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Código de barras já existe" });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /api/barbershops/:barbershopId/products/:productId - Atualizar produto
router.put(
  "/:productId",
  protectAdmin,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { barbershopId, productId } = req.params;
      const updateData = { ...req.body };

      // Remove campos que não devem ser atualizados diretamente
      delete updateData.stock;
      delete updateData.barbershop;

      const product = await Product.findOneAndUpdate(
        { _id: productId, barbershop: barbershopId },
        updateData,
        { new: true, runValidators: true }
      ).populate("name email");

      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      res.json(product);
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      if (error.code === 11000) {
        return res.status(400).json({ error: "Código de barras já existe" });
      }
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// DELETE /api/barbershops/:barbershopId/products/:productId - Deletar produto
router.delete(
  "/:productId",
  protectAdmin,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { barbershopId, productId } = req.params;

      const product = await Product.findOneAndDelete({
        _id: productId,
        barbershop: barbershopId,
      });

      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      // Deletar todas as movimentações relacionadas
      await StockMovement.deleteMany({ product: productId });

      res.json({ message: "Produto deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// POST /api/barbershops/:barbershopId/products/:productId/stock - Movimentar estoque
router.post("/:productId/stock", protectAdmin, async (req, res) => {
  try {
    const { barbershopId, productId } = req.params;
    const { type, quantity, reason, unitCost, notes } = req.body;

    if (!["entrada", "saida", "ajuste", "perda"].includes(type)) {
      return res.status(400).json({ error: "Tipo de movimentação inválido" });
    }

    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ error: "Quantidade deve ser maior que zero" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Motivo é obrigatório" });
    }

    const product = await Product.findOne({
      _id: productId,
      barbershop: barbershopId,
    });

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const previousStock = product.stock.current;
    let newStock;

    // Calcular novo estoque baseado no tipo de movimentação
    switch (type) {
      case "entrada":
        newStock = previousStock + quantity;
        break;
      case "saida":
      case "perda":
        newStock = Math.max(0, previousStock - quantity);
        break;
      case "ajuste":
        newStock = quantity; // Para ajuste, a quantidade é o valor final
        break;
    }

    // Atualizar estoque do produto
    product.stock.current = newStock;
    await product.save();

    // Registrar movimentação
    const stockMovement = new StockMovement({
      product: productId,
      type,
      quantity: type === "ajuste" ? newStock - previousStock : quantity,
      reason,
      previousStock,
      newStock,
      unitCost: unitCost || product.price.purchase,
      totalCost: (unitCost || product.price.purchase) * quantity,
      barbershop: barbershopId,
      notes,
    });

    await stockMovement.save();

    const updatedProduct = await Product.findById(productId).populate(
      "name email"
    );

    res.json({
      product: updatedProduct,
      movement: stockMovement,
    });
  } catch (error) {
    console.error("Erro ao movimentar estoque:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/barbershops/:barbershopId/products/:productId/movements - Histórico de movimentações
router.get("/:productId/movements", protectAdmin, async (req, res) => {
  try {
    const { barbershopId, productId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const movements = await StockMovement.find({
      product: productId,
      barbershop: barbershopId,
    })
      .populate("name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StockMovement.countDocuments({
      product: productId,
      barbershop: barbershopId,
    });

    res.json({
      movements,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar movimentações:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/barbershops/:barbershopId/products/reports/low-stock - Relatório de baixo estoque
router.get("/reports/low-stock", protectAdmin, async (req, res) => {
  try {
    const { barbershopId } = req.params;

    const products = await Product.find({
      barbershop: barbershopId,
      status: "ativo",
    });

    const lowStockProducts = products.filter((product) => product.isLowStock);

    res.json({
      total: lowStockProducts.length,
      products: lowStockProducts,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/barbershops/:barbershopId/products/reports/categories - Relatório por categorias
router.get(
  "/reports/categories",
  protectAdmin,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { barbershopId } = req.params;

      const categoryReport = await Product.aggregate([
        { $match: { barbershop: new mongoose.Types.ObjectId(barbershopId) } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalValue: {
              $sum: { $multiply: ["$stock.current", "$price.purchase"] },
            },
            averageStock: { $avg: "$stock.current" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      res.json(categoryReport);
    } catch (error) {
      console.error("Erro ao gerar relatório por categorias:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

export default router;
