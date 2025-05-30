import Wishlist from "../../models/Wishlist.js";
import Cart from "../../models/Carts.js";

export const getWishlist = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/users/login');
        }
        const cartItems = await Cart.find({ userId: req.user.id }).populate('productId');
        const cartCount = cartItems.length;
    

        const wishlistItems = await Wishlist.find({ userId: req.user.id }).populate('productId');
        const formattedItems = wishlistItems.map(item => ({
            product: {
                _id: item.productId._id,
                name: item.productId.name,
                images: item.productId.images,
                price: item.productId.price,
                discount: item.productId.discount || 0,
                language: item.productId.language || 'English',
                stock: item.productId.stock,
                author: item.productId.author
            }
        }));

        const wishlistCount = wishlistItems.length;

        res.render('user/wishlist', {
            wishlistItems: formattedItems,
            user: req.user,
            cartCount,
            wishlistCount,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Wishlist Page Error:', error);
        res.render('user/wishlist', {
            wishlistItems: [],
            user: req.user || null,
            wishlistCount: 0,
            cartCount,
            error: 'Failed to load wishlist'
        });
    }
};
//------------------------------------------------------------
export const addToWishlist = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Login required' });
        }

        const { productId } = req.params;
        const existing = await Wishlist.findOne({ userId: req.user.id, productId });
        if (existing) {
            const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
            return res.json({ 
                success: false, 
                message: 'Already in wishlist',
                wishlistCount 
            });
        }

        const wishlistItem = new Wishlist({ userId: req.user.id, productId });
        await wishlistItem.save();
        
        const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
        res.json({ 
            success: true,
            wishlistCount 
        });
    } catch (error) {
        console.error('Add to Wishlist Error:', error);
        res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
    }
};
//------------------------------------------------------------------------------
export const removeFromWishlist = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Login required' });
        }

        const { productId } = req.params;
        await Wishlist.deleteOne({ userId: req.user.id, productId });
        res.json({ success: true });
    } catch (error) {
        console.error('Remove from Wishlist Error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
    }
};