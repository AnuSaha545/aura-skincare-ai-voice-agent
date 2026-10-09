const express = require("express");
const { get_order_details } = require("../tools/orderTool");

const router = express.Router();

router.get("/:orderId", (req, res) => {
  const result = get_order_details(req.params.orderId.toUpperCase());

  if (!result.found) {
    return res.status(404).json(result);
  }

  res.json(result);
});

module.exports = router;