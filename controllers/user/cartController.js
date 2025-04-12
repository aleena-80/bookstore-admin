import  Cart from '../../models/Carts.js'
import Wishlist from '../../models/Wishlist.js'
import Product from '../../models/Product.js';


export const addToCart = async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Login required' });
      const { productId } = req.params;
      console.log('Add to Cart, User ID:', req.user.id, 'Product ID:', productId);
      const product = await Product.findById(productId).populate('category');
      if (!product || !product.isListed || (product.category && product.category.isListed === false) || product.stock <= 0) {
        return res.json({ success: false, message: 'Product unavailable' });
      }


      let cartItem = await Cart.findOne({ userId: req.user.id, productId });


      if (cartItem) {
        if (cartItem.quantity >= product.stock || cartItem.quantity >= 5) {
          return res.json({ success: false, message: 'Max quantity reached' });
        }
        cartItem.quantity += 1;
      } else {
        cartItem = new Cart({ userId: req.user.id, productId, quantity: 1 });
      }
      await cartItem.save();
      console.log('Added to Cart:', { productId, quantity: cartItem.quantity });
  
      const cartCount = await Cart.countDocuments({ userId: req.user.id });
      const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
      res.json({ success: true, cartCount, wishlistCount });
    } catch (error) {
      console.error('Add to Cart Error:', error);
      res.status(500).json({ success: false, message: 'Failed to add to cart' });
    }
  };
//---------------------------------------------------------------------------------------------------------
  export const getCart = async (req, res) => {
    try {
      if (!req.user) return res.redirect('/users/login');
      const cartItems = await Cart.find({ userId: req.user.id }).populate('productId');
      const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
      const cartCount = cartItems.length;
  
      const subtotal = cartItems.reduce((sum, item) => sum + item.productId.price * item.quantity * (1 - (item.productId.discount || 0) / 100), 0);
      const taxes = subtotal * 0.05;
      const shipping = 100;
      const total = subtotal + taxes + shipping;
  
      console.log('Cart Items:', cartItems.map(item => ({ name: item.productId.name, qty: item.quantity, price: item.productId.price })));
      console.log('Subtotal:', subtotal);
  
      res.render('user/cart', { 
        cartItems, 
        subtotal: subtotal.toFixed(2), 
        taxes: taxes.toFixed(2), 
        shipping: shipping.toFixed(2), 
        total: total.toFixed(2), 
        wishlistCount, 
        cartCount,
        user: req.user // Add this
      });
    } catch (error) {
      console.error('Get Cart Error:', error);
      res.render('user/cart', { 
        cartItems: [], 
        subtotal: '0.00', 
        taxes: '0.00', 
        shipping: '0.00', 
        total: '0.00', 
        wishlistCount: 0, 
        cartCount: 0,
        user: null 
      });
    }
  };
//---------------------------------------------------------------------------------------------------------
export const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, action } = req.body;
        
        const cartItem = await Cart.findOne({ _id: productId, userId }).populate('productId');
        if (!cartItem) return res.json({ success: false, message: 'Cart item not found' });

        // Check stock availability
        if (action === 'increment') {
            if (cartItem.quantity >= cartItem.productId.stock) {
                return res.json({ success: false, message: 'Out of stock' });
            }
            if (cartItem.quantity >= 10) {
                return res.json({ success: false, message: 'Maximum quantity reached (10)' });
            }
        }

        // Update quantity
        cartItem.quantity += (action === 'increment' ? 1 : -1);
        await cartItem.save();

        // Get updated cart data
        const cartItems = await Cart.find({ userId }).populate('productId');
        const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        // Calculate prices
        const subtotal = cartItems.reduce((sum, item) => {
            const discountedPrice = item.productId.price * (1 - (item.productId.discount || 0) / 100);
            return sum + (discountedPrice * item.quantity);
        }, 0);
        
        const taxes = subtotal * 0.05;
        const shipping = 100;
        const total = subtotal + taxes + shipping;

        res.json({ 
            success: true, 
            quantity: cartItem.quantity,
            stock: cartItem.productId.stock,
            cartCount,
            subtotal: subtotal.toFixed(2), 
            taxes: taxes.toFixed(2), 
            shipping: shipping.toFixed(2), 
            total: total.toFixed(2)
        });

    } catch (error) {
        console.error('Update Quantity Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update quantity' });
    }
};

//---------------------------------------------------------------------------------------
export const removeFromCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const deleted = await Cart.deleteOne({ _id: cartId, userId: req.user.id }); // Use _id, not productId
    if (deleted.deletedCount === 0) {
      return res.json({ success: false, message: 'Item not found in cart' });
    }

    const cartItems = await Cart.find({ userId: req.user.id }).populate('productId');
    const subtotal = cartItems.reduce((sum, item) => sum + item.productId.price * item.quantity * (1 - (item.productId.discount || 0) / 100), 0);
    const taxes = subtotal * 0.05; // Match your tax logic
    const shipping = cartItems.length > 0 ? 100 : 0; // Adjust as needed
    const total = subtotal + taxes + shipping;
    const cartCount = cartItems.length;
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      subtotal: subtotal.toFixed(2),
      taxes: taxes.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.error('Remove from Cart Error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};
//--------------------------------------------------------------------