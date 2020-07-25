module.exports ={
    //utility functions
 compareTransactions: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.createdAt.getTime() > b.createdAt.getTime()) return -1;
    if (b.createdAt.getTime() < a.createdAt.getTime()) return 1;
  
    return 0;
  },
  
  compareCustomers: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (
      a.transactions[0].createdAt.getTime() >
      b.transactions[0].createdAt.getTime()
    )
      return -1;
    if (
      b.transactions[0].createdAt.getTime() <
      a.transactions[0].createdAt.getTime()
    )
      return 1;
  
    return 0;
  },
  
  compareRecentTransactions: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime())
      return -1;
    if (b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime())
      return 1;
  
    return 0;
  },
  
  compareRecentDebts: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.debt.createdAt.getTime() > b.debt.createdAt.getTime()) return -1;
    if (b.debt.createdAt.getTime() < a.debt.createdAt.getTime()) return 1;
  
    return 0;
  },

  getTransactionForMonth: (obj, data) => {
    try {
      const transactionDate = new Date(obj.transaction.createdAt);
      const currentDate = new Date();
      if(currentDate.getFullYear() == transactionDate.getFullYear()){
       data[transactionDate.getMonth()] += parseFloat(obj.transaction.amount)
      }
    } catch (error) {
      data[0] += 0
    }
    
    return data

  }
}