const generateOrderId = () => {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
  };
  export default module.exports = { generateOrderId };