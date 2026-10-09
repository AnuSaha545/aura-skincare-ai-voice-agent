const orders = require("../data/orders");

function get_order_details(order_id) {
  const order = orders[order_id];

  if (!order) {
    return {
      found: false,
      message: `No order found with ID ${order_id}`,
    };
  }

  return {
    found: true,
    order,
  };
}

module.exports = { get_order_details };