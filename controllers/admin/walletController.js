import Wallet from '../../models/Wallets.js';
import User from '../../models/User.js';

export const getTransactions = async (req, res) => {
    try {
        const wallets = await Wallet.find().populate('userId').populate('transactions.source.orderId');
        const transactions = wallets.flatMap(wallet =>
            wallet.transactions.map(t => ({
                transactionId: t.transactionId,
                date: t.date,
                user: { id: wallet.userId._id, name: wallet.userId.name, email: wallet.userId.email },
                type: t.type,
                amount: t.amount,
                source: t.source
            }))
        );
        console.log(`Fetched ${transactions.length} transactions for admin`);
        res.render('admin/transactions', { transactions, transaction: null, user: null, error: null });
    } catch (error) {
        console.error('Get Transactions Error:', error);
        res.render('admin/transactions', {
            transactions: [],
            transaction: null,
            user: null,
            error: 'Failed to load transactions'
        });
    }
};

export const getTransactionDetails = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const wallets = await Wallet.find().populate('userId').populate('transactions.source.orderId');
        const wallet = wallets.find(w => w.transactions.some(t => t.transactionId === transactionId));
        if (!wallet) {
            console.log(`Transaction ${transactionId} not found`);
            return res.render('admin/transactions', {
                transactions: [],
                transaction: null,
                user: null,
                error: 'Transaction not found'
            });
        }
        const transaction = wallet.transactions.find(t => t.transactionId === transactionId);
        if (!transaction) {
            console.log(`Transaction ${transactionId} not found`);
            return res.render('admin/transactions', {
                transactions: [],
                transaction: null,
                user: null,
                error: 'Transaction not found'
            });
        }
        console.log(`Fetched transaction ${transactionId} for admin`);
        res.render('admin/transactions', {
            transactions: [],
            transaction,
            user: { id: wallet.userId._id, name: wallet.userId.name, email: wallet.userId.email },
            error: null
        });
    } catch (error) {
        console.error('Get Transaction Details Error:', error);
        res.render('admin/transactions', {
            transactions: [],
            transaction: null,
            user: null,
            error: 'Failed to load transaction details'
        });
    }
};