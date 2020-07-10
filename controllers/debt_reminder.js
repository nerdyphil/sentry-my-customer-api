
const UserModel = require('../models/store_admin')
const Debt = require("../models/debt_reminders");
const Response = require('../util/response_manager')
const HttpStatus = require('../util/http_status')
const mongoose = require('mongoose')
const Transaction = require("../models/transaction");
const { all } = require('../routes/customer');

exports.create = async (req,res)=>{
    // Add new message
    let transaction_id = req.body.transaction_id || req.params.transaction_id;
    let identifier = req.user.phone_number;
    const { store_name, customer_phone_number , message, status, pay_date, amount} = req.body;

    if(!customer_phone_number || !message || !status || !pay_date || !amount){
        res.status(500).json({
            sucess: false,
            message: "Missing fields",
            error: {
              statusCode: 500,
              message: "customer_phone_number, store_name, pay_date, amount, message and status are required"
            }
          })
    }

    try{

        UserModel.findOne({ identifier })
            .then(user => {
                
                let store = user.stores.find(store => store.store_name == store_name);
                let customer = store.customers.find(customer => customer.phone_number === customer_phone_number);
                let transaction = customer.transactions.find(transaction => transaction._id == transaction_id);

                const newDebt = {
                    user_phone_number: identifier,
                    customer_phone_number,
                    amount: amount,
                    ts_ref_id: transaction._id,
                    message: message,
                    status: status,
                    expected_pay_date: new Date(pay_date),
                }
                
                transaction.debts.push(newDebt);

                user.save().then(result => {
                    res.status(200).json({
                        success: true,
                        message: "Debt created successfully",
                        data: {
                            statusCode: 200,
                            debt: transaction.debts[transaction.debts.length - 1]
                        }
                    })
                });

            })
            .catch(err => {
                res.status(404).json({
                    sucess: false,
                    message: "User not found or some body parameters are not correct",
                    error: {
                      statusCode: 404,
                      message: err.message
                    }
                })
            })
            
    } catch (err){
        res.status(500).json({
            sucess: false,
            message: "Some error occurred while creating debt",
            error: {
              statusCode: 500,
              message: err.message
            }
        })
    }
        
}

exports.getAll = async (req,res)=>{
    // Find all the Debts
    const identifier = req.user.phone_number;

    UserModel.findOne({ identifier })
        .then(user => {
            let allDebts = [];
            user.stores.forEach((store, storeIndex) => {
                // allDebts.push({ store_name: store.store_name, store_debts: [] });
                store.customers.forEach(customer => {
                    customer.transactions.forEach(transaction => {
                        transaction.debts.forEach(debt => {
                            let debtToSend = { debt_obj: debt, store_name: store.store_name }
                            allDebts.push(debtToSend);
                            // allDebts[storeIndex].store_debts.push(debt);
                        })
                    })
                })
            });

            return res.status(200).json({
                success: true,
                message: "All Debts",
                data: {
                    statusCode: 200,
                    debts: allDebts
                }
            });
        })
        .catch(err => {
            res.status(500).json({
                sucess: false,
                message: "Couldn't find user or some server error occurred",
                error: {
                  statusCode: 500,
                  message: err.message
                }
            });
        })
}

exports.getById = async (req,res)=>{
    let identifier = req.user.phone_number;
    if(!req.params.debtId) 
        return res.json({
            success: false,
            message: "No Id sent",
            error: {
                statusCode: 400,
                message: "No Id sent"
            }
        });
    
    UserModel.findOne({ identifier })
        .then(user => {
            let allDebts = [];
            user.stores.forEach(store => {
                store.customers.forEach(customer => {
                    customer.transactions.forEach(transaction => {
                        transaction.debts.forEach(debt => {
                            allDebts.push(debt);
                        })
                    })
                })
            });
            
            let debtById = allDebts.find(debt => debt._id == req.params.debtId);

            return res.status(200).json({
                success: true,
                message: "Debt found",
                data: {
                    statusCode: 200,
                    debt: debtById
                }
            }); 
        })
        .catch(err => {
            res.status(500).json({
                sucess: false,
                message: "Couldn't find user or some server error occurred",
                error: {
                  statusCode: 500,
                  message: err.message
                }
            });
        })
}

exports.updateById = async (req, res) => {
    let identifier = req.user.phone_number;
    let { status, message, amount, pay_date } = req.body;

    try {
        UserModel.findOne({ identifier })
        .then(user => {
            let allDebts = [];
            user.stores.forEach(store => {
                store.customers.forEach(customer => {
                    customer.transactions.forEach(transaction => {
                        transaction.debts.forEach(debt => {
                            allDebts.push(debt);
                        })
                    })
                })
            });
            
            let debtById = allDebts.find(debt => debt._id == req.params.debtId);
            let update = {
                amount: amount || debtById.amount,
                message: message || debtById.message,
                status: status || debtById.status,
                pay_date: Date(pay_date) || debtById.expected_pay_date
            }
            debtById = Object.assign(debtById, update);
            user.save().then(result => {
                res.status(200).json({
                    success: true,
                    message: "Debt updated successfully",
                    data: {
                        statusCode: 200,
                        debt: debtById,
                    }
                })
            })
        })
        .catch(err => {
            res.status(404).json({
                sucess: false,
                message: "Couldn't find user or some server error occurred",
                error: {
                  statusCode: 404,
                  message: err.message
                }
            });
        })
    } catch(err) {
        res.status(500).json({
            sucess: false,
            message: "Some server error occurred",
            error: {
              statusCode: 500,
              message: err.message
            }
        });
    }
     
};

exports.deleteById = async (req, res) => {
    let identifier = req.user.phone_number;
    let { store_name, customer_phone_number } = req.body;
    let id = req.params.debtId;

    if(!store_name || !customer_phone_number) {
        res.status(404).json({
            sucess: false,
            message: "Please add input fields",
            error: {
              statusCode: 404,
              message: 'Body params store_name, customer_phone_number missing'
            }
        })
    }

    try {
        UserModel.findOne({ identifier })
        .then(user => {
            let store = user.stores.find(store => store.store_name === store_name);
            let customer = store.customers.find(customer => customer.phone_number == customer_phone_number);
            let transaction;;
            customer.transactions.forEach(trans => {
                trans.debts.forEach(debt => {
                    if(debt._id == id) {
                        trans.debts.splice(trans.debts.indexOf(debt), 1);
                        transaction = trans;
                    }
                })
            });

            user.save().then(result => {
                res.status(201).json({
                    success: true,
                    message: "Debt deleted successfully",
                    data: {
                        statusCode: 201,
                        new_transaction: transaction,
                    }
                })
            })
            .catch(err => {
                res.status(404).json({
                    sucess: false,
                    message: "Couldn't remove debt",
                    error: {
                      statusCode: 404,
                      message: err.message
                    }
                })
            })
        })
        .catch(err => {
            res.status(404).json({
                sucess: false,
                message: "Couldn't find user or some server error occurred",
                error: {
                  statusCode: 404,
                  message: err.message
                }
            })
        })
    } catch(err) {
        res.status(500).json({
            sucess: false,
            message: "Some server error occurred",
            error: {
              statusCode: 500,
              message: err.message
            }
        });
    }
    
};

