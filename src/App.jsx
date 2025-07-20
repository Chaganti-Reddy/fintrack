import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  User, DollarSign, TrendingUp, TrendingDown, Calendar, Plus, Settings, LogOut, Eye, EyeOff,
  Trash2, Upload, Target, ChevronLeft, ChevronRight, PiggyBank, CreditCard,
  Landmark, Wallet, ShoppingBag, Utensils, Home, Car, FileText, Heart, BookOpen, ShoppingCart
} from 'lucide-react';
import { supabase } from './supabase';

const SuccessDialog = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
      <p className="text-white/70 mb-6">{message}</p>
      <button
        onClick={onClose}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
      >
        OK
      </button>
    </div>
  </div>
);

const FinanceTracker = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [viewPeriod, setViewPeriod] = useState('daily');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showAddMonthlyGoal, setShowAddMonthlyGoal] = useState(false);
  const [showAddYearlyGoal, setShowAddYearlyGoal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [accountData, setAccountData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [monthlyGoalData, setMonthlyGoalData] = useState({
    amount: '',
    description: '',
    target_date: getNextMonth(),
    priority: 1
  });
  const [yearlyGoalData, setYearlyGoalData] = useState({
    amount: '',
    description: '',
    target_date: getNextYear(),
    priority: 1
  });
  const [transactionData, setTransactionData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].split('.')[0],
    savings: '',
    loanAction: '',
    loanName: '',
    loanId: '',
    personType: 'new',
    loanTime: ''
  });
  const [loans, setLoans] = useState([]);
  const fileInputRef = useRef(null);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setShowAddTransaction(false);
      setShowAddMonthlyGoal(false);
      setShowAddYearlyGoal(false);
      setShowAccountSettings(false);
      setShowDeleteAccount(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  function getNextMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 7);
  }

  function getNextYear() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.getFullYear().toString();
  }

  useEffect(() => {
    if (viewPeriod === 'monthly') {
      const date = new Date(`${selectedMonth}-01`);
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  }, [selectedMonth, viewPeriod]);

  useEffect(() => {
    if (viewPeriod === 'yearly') {
      const date = new Date(`${selectedYear}-01-01`);
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  }, [selectedYear, viewPeriod]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setUser(session.user);
        setAccountData({
          name: session.user.user_metadata?.name || '',
          email: session.user.email || '',
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        fetchProfilePicture(session.user.id);
        fetchGoals(session.user.id);
        fetchLoans(session.user.id);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated]);

  const fetchTransactions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('User is not authenticated');
      return;
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data);
    }
  };

  const fetchGoals = async (userId) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching goals:', error);
    } else {
      setGoals(data);
    }
  };

  const fetchLoans = async (userId) => {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching loans:', error);
    } else {
      setLoans(data);
    }
  };

  const fetchProfilePicture = async (userId) => {
    try {
      const filePath = `${userId}/${userId}/profile-picture.png`;
      const { data: { publicUrl }, error } = supabase
        .storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      if (error) {
        console.error('Error getting public URL:', error);
        setProfilePicUrl('');
        return;
      }

      const response = await fetch(publicUrl);
      if (!response.ok) {
        throw new Error('Image not found');
      }
      setProfilePicUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err) {
      console.error('Image not accessible:', err);
      setProfilePicUrl('');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (authMode === 'register') {
      if (authData.password !== authData.confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: {
            name: authData.name
          }
        }
      });

      if (error) {
        setErrorMessage(error.message || 'Error signing up');
      } else {
        setMessage('Please check your email for verification and then log in.');
        setAuthMode('login');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid login details');
      } else {
        setIsAuthenticated(true);
        setUser(data.user);
        setAccountData({
          name: data.user.user_metadata?.name || '',
          email: data.user.email || '',
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        fetchProfilePicture(data.user.id);
        fetchGoals(data.user.id);
        fetchLoans(data.user.id);
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setAuthData({ email: '', password: '', name: '', confirmPassword: '' });
      setProfilePicUrl('');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Not authenticated");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: deletePassword
    });

    if (signInError) {
      alert("Incorrect password");
      return;
    }

    const res = await fetch("/.netlify/functions/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: session.user.id }),
    });

    const result = await res.json();
    if (res.ok) {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setShowDeleteAccount(false);
      setSuccessMessage("Your account and all data were deleted.");
      setShowSuccessDialog(true);
    } else {
      alert("Delete failed: " + result.error);
    }
  };

  const calculateLoanBalance = () => {
    return loans.reduce((sum, loan) => sum + loan.remaining_amount, 0);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      setErrorMessage('User is not authenticated');
      return;
    }

    const allowedTypes = ['income', 'expense', 'savings', 'loan'];
    if (!allowedTypes.includes(transactionData.type)) {
      console.error('Invalid transaction type');
      setErrorMessage('Invalid transaction type');
      return;
    }

    if (transactionData.type === 'savings') {
      const loanBalance = calculateLoanBalance();
      const savingsAmount = parseFloat(transactionData.savings);
      const balanceAfterSavings = stats.balance - savingsAmount;
      if (balanceAfterSavings - loanBalance < 0) {
        setErrorMessage('You have loans to clear. Please clear them first to make savings.');
        return;
      }
      if (savingsAmount > stats.balance) {
        setErrorMessage('Savings amount should be less than the current balance.');
        return;
      }
    }

    if (transactionData.type === 'loan') {
      const loanDateTime = new Date(`${transactionData.date}T${transactionData.loanTime || '00:00'}`).toISOString();
      const loanAmount = parseFloat(transactionData.amount);

      if (transactionData.loanAction === 'take') {
        if (transactionData.personType === 'new') {
          // Insert a new loan
          const { data: loanData, error: loanError } = await supabase
            .from('loans')
            .insert([{
              user_id: session.user.id,
              name: transactionData.loanName,
              description: [transactionData.description],
              total_amount: loanAmount,
              remaining_amount: loanAmount,
              loan_date: [loanDateTime],
              transaction_amount: [loanAmount],
              type: ['take']
            }])
            .select();

          if (loanError) {
            console.error('Error adding loan:', loanError);
            setErrorMessage('Error adding loan: ' + loanError.message);
            return;
          }
        } else {
          // Update an existing loan
          const selectedLoan = loans.find(loan => loan.id === parseInt(transactionData.loanId));
          if (!selectedLoan) {
            setErrorMessage('Selected loan not found.');
            return;
          }

          const updatedDescription = [...selectedLoan.description, transactionData.description];
          const updatedTransactionAmount = [...selectedLoan.transaction_amount, loanAmount];
          const updatedRemainingAmount = selectedLoan.remaining_amount + loanAmount;
          const updatedLoanDate = [...selectedLoan.loan_date, loanDateTime];

          const { error: loanError } = await supabase
            .from('loans')
            .update({
              total_amount: updatedRemainingAmount,
              remaining_amount: updatedRemainingAmount,
              description: updatedDescription,
              loan_date: updatedLoanDate,
              transaction_amount: updatedTransactionAmount,
              type: [...selectedLoan.type, 'take']
            })
            .eq('id', selectedLoan.id);

          if (loanError) {
            console.error('Error updating loan:', loanError);
            setErrorMessage('Error updating loan: ' + loanError.message);
            return;
          }
        }

        // Add a transaction of type 'income' for taking a loan
        const loanName = transactionData.personType === 'existing'
          ? loans.find(loan => loan.id === parseInt(transactionData.loanId))?.name || 'Unknown'
          : transactionData.loanName;

        const { data: incomeTransaction, error: incomeError } = await supabase
          .from('transactions')
          .insert([{
            type: 'income',
            amount: loanAmount,
            description: `Loan taken: ${loanName}`,
            category: 'Loan',
            date: loanDateTime,
            user_id: session.user.id
          }]);

        if (incomeError) {
          console.error('Error adding income transaction for loan:', incomeError);
          setErrorMessage('Error adding income transaction for loan: ' + incomeError.message);
          return;
        }

      } else if (transactionData.loanAction === 'clear') {
        const selectedLoan = loans.find(loan => loan.id === parseInt(transactionData.loanId));
        if (!selectedLoan) {
          setErrorMessage('Selected loan not found.');
          return;
        }

        const clearAmount = parseFloat(transactionData.amount);
        if (clearAmount > selectedLoan.remaining_amount) {
          setErrorMessage('Clear amount exceeds remaining loan amount.');
          return;
        }

        const updatedDescription = [...selectedLoan.description, transactionData.description];
        const updatedTransactionAmount = [...selectedLoan.transaction_amount, clearAmount];
        const updatedRemainingAmount = selectedLoan.remaining_amount - clearAmount;
        const updatedLoanDate = [...selectedLoan.loan_date, loanDateTime];

        const { error: loanError } = await supabase
          .from('loans')
          .update({
            remaining_amount: updatedRemainingAmount,
            description: updatedDescription,
            loan_date: updatedLoanDate,
            transaction_amount: updatedTransactionAmount,
            type: [...selectedLoan.type, 'clear']
          })
          .eq('id', selectedLoan.id);

        if (loanError) {
          console.error('Error updating loan:', loanError);
          setErrorMessage('Error updating loan: ' + loanError.message);
          return;
        }

        // Add a reverse 'income' transaction to negate the original loan
        const { data: reverseIncome, error: reverseError } = await supabase
          .from('transactions')
          .insert([{
            type: 'income',
            amount: -clearAmount,
            description: `Loan cleared: ${selectedLoan.name}`,
            category: 'Loan',
            date: loanDateTime,
            user_id: session.user.id
          }]);

        if (reverseError) {
          console.error('Error reversing income transaction for loan:', reverseError);
          setErrorMessage('Error reversing income for loan: ' + reverseError.message);
          return;
        }

      }

      await fetchLoans(session.user.id);
    } else {
      // Handle other transaction types (income, expense, savings)
      const transactionDateTime = new Date(`${transactionData.date}T${transactionData.time || '00:00'}`).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: transactionData.type,
          amount: transactionData.type === 'savings' ? parseFloat(transactionData.savings) : parseFloat(transactionData.amount),
          description: transactionData.description,
          category: transactionData.category,
          date: transactionDateTime,
          savings: transactionData.type === 'savings' ? parseFloat(transactionData.savings) : 0,
          user_id: session.user.id
        }]);

      if (error) {
        console.error('Error adding transaction:', error);
        setErrorMessage('Error adding transaction: ' + error.message);
        return;
      }

      setTransactions([{
        type: transactionData.type,
        amount: transactionData.type === 'savings' ? parseFloat(transactionData.savings) : parseFloat(transactionData.amount),
        description: transactionData.description,
        category: transactionData.category,
        date: transactionDateTime,
        savings: transactionData.type === 'savings' ? parseFloat(transactionData.savings) : 0
      }, ...transactions]);
    }

    // Reset transaction data
    setTransactionData({
      type: 'expense',
      amount: '',
      description: '',
      category: '',
      date: selectedDate,
      savings: 0,
      loanAction: '',
      loanName: '',
      loanId: '',
      personType: 'new',
      loanTime: ''
    });

    setShowAddTransaction(false);
    setErrorMessage('');
    await fetchTransactions();
  };

  const handleAddMonthlyGoal = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('User is not authenticated');
      return;
    }

    const newGoal = {
      ...monthlyGoalData,
      type: 'monthly',
      amount: parseFloat(monthlyGoalData.amount),
      user_id: session.user.id,
      target_date: `${monthlyGoalData.target_date}-01`,
      goal_created: new Date().toISOString(),
      status: 'pending',
      is_reached: false
    };

    const { data, error } = await supabase
      .from('goals')
      .insert([newGoal]);

    if (error) {
      console.error('Error adding goal:', error);
    } else {
      setGoals([...goals, newGoal]);
      setMonthlyGoalData({
        amount: '',
        description: '',
        target_date: getNextMonth(),
        priority: 1
      });
      setShowAddMonthlyGoal(false);
    }
  };

  const handleAddYearlyGoal = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('User is not authenticated');
      return;
    }

    const newGoal = {
      ...yearlyGoalData,
      type: 'yearly',
      amount: parseFloat(yearlyGoalData.amount),
      user_id: session.user.id,
      target_date: `${yearlyGoalData.target_date}-01-01`,
      goal_created: new Date().toISOString(),
      status: 'pending',
      is_reached: false
    };

    const { data, error } = await supabase
      .from('goals')
      .insert([newGoal]);

    if (error) {
      console.error('Error adding goal:', error);
    } else {
      setGoals([...goals, newGoal]);
      setYearlyGoalData({
        amount: '',
        description: '',
        target_date: getNextYear(),
        priority: 1
      });
      setShowAddYearlyGoal(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return;
    }

    if (accountData.newPassword && accountData.newPassword !== accountData.confirmNewPassword) {
      alert('New passwords do not match');
      return;
    }

    const updates = {
      data: { name: accountData.name },
      email: accountData.email
    };

    if (accountData.newPassword) {
      updates.password = accountData.newPassword;
    }

    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      console.error('Error updating account:', error);
      alert('Error updating account: ' + error.message);
    } else {
      setSuccessMessage('Account updated successfully!');
      setShowSuccessDialog(true);
      setUser({ ...session.user, user_metadata: { ...session.user.user_metadata, name: accountData.name }, email: accountData.email });
      setShowAccountSettings(false);
    }
  };

  const handleToggleGoalStatus = async (goalId, currentStatus) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('User is not authenticated');
      return;
    }

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const { data, error } = await supabase
      .from('goals')
      .update({ status: newStatus, is_reached: newStatus === 'completed' })
      .eq('id', goalId)
      .select();

    if (error) {
      console.error('Error updating goal status:', error);
    } else {
      setGoals(goals.map(goal => goal.id === goalId ? { ...goal, status: newStatus, is_reached: newStatus === 'completed' } : goal));
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.error('No file selected');
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      return;
    }

    const filePath = `${session.user.id}/${session.user.id}/profile-picture.png`;
    try {
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          upsert: true
        });

      if (error) {
        console.error('Error uploading profile picture:', error);
      } else {
        const { data: { publicUrl }, error: urlError } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);

        if (urlError) {
          console.error('Error getting public URL:', urlError);
        } else {
          setProfilePicUrl(`${publicUrl}?t=${Date.now()}`);
        }
      }
    } catch (err) {
      console.error('Unexpected error during upload:', err);
    }
  };

  const calculateStats = () => {
    const selectedDateObj = new Date(selectedDate);
    const selectedMonthObj = new Date(`${selectedMonth}-01`);
    const filterMonth = selectedMonthObj.getMonth();
    const filterYear = selectedMonthObj.getFullYear();
    const filterYearly = parseInt(selectedYear);

    const filterByStatsPeriod = (transaction) => {
      const date = new Date(transaction.date);
      if (viewPeriod === 'monthly') {
        return date.getMonth() === filterMonth && date.getFullYear() === filterYear;
      } else if (viewPeriod === 'yearly') {
        return date.getFullYear() === filterYearly;
      } else {
        return (
          date.getFullYear() === selectedDateObj.getFullYear() &&
          date.getMonth() === selectedDateObj.getMonth()
        );
      }
    };

    const filterByDailyPeriod = (transaction) => {
      const date = new Date(transaction.date);
      return date.toDateString() === selectedDateObj.toDateString();
    };

    // Stats: use month/year
    const filteredStatsTransactions = transactions
      .filter(t => filterByStatsPeriod(t) &&
        !(t.description?.startsWith("Loan taken:") || t.description?.startsWith("Loan cleared:"))
      );

    const income = filteredStatsTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredStatsTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = transactions.filter(t => t.type === 'savings').reduce((sum, t) => sum + t.savings, 0);
    const balance = income - expenses;

    // Loans: use month/year
    const loanTransactions = loans.flatMap(loan =>
      loan.loan_date.map((date, index) => ({
        id: `loan-${loan.id}-${index}`,
        type: 'loan',
        loanAction: loan.type[index],
        name: loan.name,
        description: loan.description[index],
        amount: loan.transaction_amount[index],
        date: date,
        created_at: loan.loan_date[index]
      }))
    ).filter(t => filterByStatsPeriod(t));

    // Daily list: use selectedDate
    const filteredTransactionsForDisplay = [...filteredStatsTransactions, ...loanTransactions]
      .filter(filterByDailyPeriod)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      income,
      expenses,
      savings,
      balance,
      loanBalance: calculateLoanBalance(),
      filtered: filteredTransactionsForDisplay
    };
  };

  const calculateGoalProgress = (goal) => {
    const goalAmount = goal.amount;
    const goalDate = new Date(goal.target_date);
    const savingsTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transaction.type === 'savings' && transactionDate <= goalDate;
    });

    const totalSaved = savingsTransactions.reduce((sum, transaction) => sum + transaction.savings, 0);
    const progressPercentage = (totalSaved / goalAmount) * 100;

    return { totalSaved, progressPercentage };
  };

  const getChartData = () => {
    const stats = calculateStats();
    const { filtered } = stats;
    const dateMap = {};

    filtered.forEach(transaction => {
      let dateKey;
      const transactionDate = new Date(transaction.date);

      if (viewPeriod === 'daily') {
        dateKey = transactionDate.toDateString();
      } else if (viewPeriod === 'monthly') {
        dateKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth() + 1}`;
      } else if (viewPeriod === 'yearly') {
        dateKey = transactionDate.getFullYear().toString();
      }

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, income: 0, expenses: 0, savings: 0 };
      }

      if (transaction.type === 'income') {
        dateMap[dateKey].income += transaction.amount;
      } else if (transaction.type === 'expense') {
        dateMap[dateKey].expenses += transaction.amount;
      } else if (transaction.type === 'savings') {
        dateMap[dateKey].savings += transaction.savings;
      }
    });

    return Object.entries(dateMap).map(([date, values]) => ({ ...values, date }));
  };

  const getCategoryData = () => {
    const stats = calculateStats();
    const expenseCategoryMap = {};
    const incomeCategoryMap = {};

    stats.filtered.forEach(transaction => {
      if (transaction.type === 'expense') {
        expenseCategoryMap[transaction.category] = (expenseCategoryMap[transaction.category] || 0) + transaction.amount;
      } else if (transaction.type === 'income') {
        incomeCategoryMap[transaction.category] = (incomeCategoryMap[transaction.category] || 0) + transaction.amount;
      }
    });

    const expenseCategoryData = Object.entries(expenseCategoryMap).map(([category, amount], index) => ({
      category,
      amount,
      percentage: ((amount / stats.expenses) * 100).toFixed(1)
    }));

    const incomeCategoryData = Object.entries(incomeCategoryMap).map(([category, amount], index) => ({
      category,
      amount,
      percentage: ((amount / stats.income) * 100).toFixed(1)
    }));

    return { expenseCategoryData, incomeCategoryData };
  };

  const handlePreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleEndOfMonth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('User is not authenticated');
      return;
    }

    const currentDate = new Date();
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    if (currentDate.toDateString() === lastDayOfMonth.toDateString()) {
      const stats = calculateStats();
      if (stats.balance > 0) {
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            type: 'savings',
            amount: 0,
            savings: stats.balance,
            description: 'End of month savings',
            date: new Date().toISOString(),
            user_id: session.user.id,
          }]);

        if (error) {
          console.error('Error adding end of month savings:', error);
        } else {
          setTransactions([{
            type: 'savings',
            amount: 0,
            savings: stats.balance,
            description: 'End of month savings',
            date: new Date().toISOString(),
          }, ...transactions]);
        }
      }
    }
  };

  useEffect(() => {
    handleEndOfMonth();
  }, [transactions]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Finance Tracker</h1>
              <p className="text-white/70">Manage your finances with style</p>
            </div>
            {message && <p className="text-green-400 text-center mb-4">{message}</p>}
            {errorMessage && <p className="text-red-500 text-center mb-4">{errorMessage}</p>}
            <div className="flex bg-white/10 rounded-full p-1 mb-6">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${authMode === 'login'
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'text-white/70 hover:text-white'
                  }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${authMode === 'register'
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'text-white/70 hover:text-white'
                  }`}
              >
                Register
              </button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={authData.name}
                    onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {authMode === 'register' && (
                <div>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={authData.confirmPassword}
                    onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {authMode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const chartData = getChartData();
  const { expenseCategoryData, incomeCategoryData } = getCategoryData();
  const completedGoals = goals.filter(goal => goal.status === 'completed').length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Finance Tracker</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${currentView === 'dashboard'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${currentView === 'profile'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>
      {currentView === 'dashboard' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Financial Overview</h2>
            <div className="flex flex-wrap items-center space-x-4">
              {viewPeriod === 'daily' && (
                <div className="flex items-center space-x-2">
                  <button onClick={handlePreviousDay} className="p-2 bg-white/10 rounded-full">
                    <ChevronLeft size={20} className="text-white" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button onClick={handleNextDay} className="p-2 bg-white/10 rounded-full">
                    <ChevronRight size={20} className="text-white" />
                  </button>
                </div>
              )}
              {viewPeriod === 'monthly' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {months.map(month => (
                    <option key={month.value} value={`${new Date().getFullYear()}-${month.value}`}>
                      {month.label}
                    </option>
                  ))}
                </select>
              )}
              {viewPeriod === 'yearly' && (
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              )}
              <div className="flex bg-white/10 rounded-full p-1 backdrop-blur-xl">
                {['daily', 'monthly', 'yearly'].map(period => (
                  <button
                    key={period}
                    onClick={() => setViewPeriod(period)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${viewPeriod === period
                      ? 'bg-white text-purple-900 shadow-lg'
                      : 'text-white/70 hover:text-white'
                      }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Income</p>
                  <p className="text-2xl font-bold text-green-400">${stats.income.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Expenses</p>
                  <p className="text-2xl font-bold text-red-400">${stats.expenses.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Savings</p>
                  <p className="text-2xl font-bold text-blue-400">${stats.savings.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Balance</p>
                  <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${stats.balance.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Loan Remaining</p>
                  <p className="text-2xl font-bold text-yellow-400">${calculateLoanBalance().toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Landmark className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>
          {viewPeriod === 'daily' && (
            <>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Transactions</h3>
                  <button
                    onClick={() => setShowAddTransaction(true)}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                {stats.filtered.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {stats.filtered.map(transaction => (
                      <div key={transaction.id || Math.random()} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-500/20' : transaction.type === 'savings' ? 'bg-blue-500/20' : transaction.type === 'loan' ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                            {transaction.type === 'income' ? <TrendingUp className="w-5 h-5 text-green-400" /> :
                              transaction.type === 'savings' ? <PiggyBank className="w-5 h-5 text-blue-400" /> :
                                transaction.type === 'loan' ? (
                                  transaction.loanAction === 'take' ? <ShoppingBag className="w-5 h-5 text-yellow-400" /> : <CreditCard className="w-5 h-5 text-yellow-400" />
                                ) : <TrendingDown className="w-5 h-5 text-red-400" />}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {transaction.type === 'loan' ? (
                                transaction.loanAction === 'take' ? (
                                  `From ${transaction.name} - ${transaction.description}`
                                ) : (
                                  `To ${transaction.name}`
                                )
                              ) : (
                                transaction.description
                              )}
                            </p>
                            <p className="text-white/70 text-sm">{new Date(transaction.date).toISOString().slice(0, 10)}
                            </p>
                          </div>
                        </div>
                        <p className={`font-bold ${transaction.type === 'income' ? 'text-green-400' : transaction.type === 'savings' ? 'text-blue-400' : transaction.type === 'loan' && transaction.loanAction === 'clear' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : ''}
                          {transaction.type === 'savings' ? 'S: ' : ''}
                          ${transaction.type === 'savings' ? transaction.savings.toLocaleString() : Math.abs(transaction.amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 w-full">
                    <p className="text-white/70 text-center text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                      No transactions available.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          {viewPeriod === 'monthly' && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Monthly Goals</h3>
                <button
                  onClick={() => setShowAddMonthlyGoal(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="text-white font-medium mb-4">
                Completed Goals: {completedGoals}
              </div>
              {goals.filter(goal => goal.type === 'monthly' && new Date(goal.goal_created).getMonth() === new Date(selectedMonth).getMonth()).length > 0 ? (
                goals
                  .filter(goal => goal.type === 'monthly' && new Date(goal.goal_created).getMonth() === new Date(selectedMonth).getMonth())
                  .sort((a, b) => a.priority - b.priority)
                  .map(goal => {
                    const { totalSaved, progressPercentage } = calculateGoalProgress(goal);
                    const remainingAmount = goal.amount - totalSaved;
                    return (
                      <div key={goal.id} className="flex items-center p-4 bg-white/5 rounded-2xl mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-grow ml-4">
                          <p className="text-white font-medium mb-2">{goal.description}</p>
                          <div className="flex space-x-4 flex-wrap">
                            <p className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">Target: ${goal.amount}</p>
                            <p className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Date: {goal.target_date}</p>
                            <p className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">Remaining: ${remainingAmount.toFixed(2)}</p>
                            <p className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Progress: {progressPercentage.toFixed(2)}%</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={goal.status === 'completed'}
                          onChange={() => handleToggleGoalStatus(goal.id, goal.status)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                      </div>
                    );
                  })
              ) : (
                <div className="flex items-center justify-center h-30 w-full">
                  <p className="text-white/70 text-center text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                    No goals set for this month. Please add a goal.
                  </p>
                </div>
              )}
            </div>
          )}
          {viewPeriod === 'yearly' && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Yearly Goals</h3>
                <button
                  onClick={() => setShowAddYearlyGoal(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="text-white font-medium mb-4">
                Completed Goals: {completedGoals}
              </div>
              {goals.filter(goal => goal.type === 'yearly' && new Date(goal.goal_created).getFullYear() === parseInt(selectedYear)).length > 0 ? (
                goals
                  .filter(goal => goal.type === 'yearly' && new Date(goal.goal_created).getFullYear() === parseInt(selectedYear))
                  .sort((a, b) => a.priority - b.priority)
                  .map(goal => {
                    const { totalSaved, progressPercentage } = calculateGoalProgress(goal);
                    const remainingAmount = goal.amount - totalSaved;
                    return (
                      <div key={goal.id} className="flex items-center p-4 bg-white/5 rounded-2xl mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-grow ml-4">
                          <p className="text-white font-medium mb-2">{goal.description}</p>
                          <div className="flex space-x-4 flex-wrap">
                            <p className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">Target: ${goal.amount}</p>
                            <p className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Date: {goal.target_date}</p>
                            <p className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">Remaining: ${remainingAmount.toFixed(2)}</p>
                            <p className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Progress: {progressPercentage.toFixed(2)}%</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={goal.status === 'completed'}
                          onChange={() => handleToggleGoalStatus(goal.id, goal.status)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                      </div>
                    );
                  })
              ) : (
                <div className="flex items-center justify-center h-30 w-full">
                  <p className="text-white/70 text-center text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                    No goals set for this year. Please add a goal.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Loans Remaining</h3>
            </div>
            {loans.filter(loan => loan.remaining_amount > 0).length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {loans.filter(loan => loan.remaining_amount > 0).map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{loan.name}</p>
                        {/* <p className="text-white/70 text-sm">{loan.description.join(', ')}</p> */}
                      </div>
                    </div>
                    <p className="text-yellow-400 font-medium">
                      ${loan.remaining_amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 w-full">
                <p className="text-white/70 text-center text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                  No loans available.
                </p>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4">Expense Categories</h3>
              {expenseCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={expenseCategoryData} cx="50%" cy="50%" labelLine={false} label={({ category, percentage }) => `${category}: ${percentage}%`} outerRadius={80} fill="#8884d8" dataKey="amount">
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 w-full">
                  <p className="text-white/70 text-center text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                    No expense data available.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4">Income Categories</h3>
              {incomeCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={incomeCategoryData} cx="50%" cy="50%" labelLine={false} label={({ category, percentage }) => `${category}: ${percentage}%`} outerRadius={80} fill="#8884d8" dataKey="amount">
                      {incomeCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 w-full">
                  <p className="text-white/70 text-center text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
                    No income data available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {currentView === 'profile' && (
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="relative w-24 h-24 mx-auto mb-4">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                    onError={() => setProfilePicUrl('')}
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 bg-white/20 p-1 rounded-full"
                >
                  <Upload size={16} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{user?.user_metadata?.name || user?.email}</h2>
              <p className="text-white/70">{user?.email}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Account Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Total Transactions</span>
                    <span className="text-white font-medium">{transactions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Account Balance</span>
                    <span className={`font-medium ${stats.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${stats.balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">This Month's Income</span>
                    <span className="text-green-400 font-medium">${stats.income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">This Month's Expenses</span>
                    <span className="text-red-400 font-medium">${stats.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">This Month's Savings</span>
                    <span className="text-blue-400 font-medium">${stats.savings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Account Settings</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAccountSettings(true)}
                    className="w-full p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5" />
                      <span>Account Settings</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowDeleteAccount(true)}
                    className="w-full p-3 bg-red-500/20 rounded-2xl text-red-400 hover:bg-red-500/30 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Trash2 className="w-5 h-5" />
                      <span>Delete Account</span>
                    </div>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add Transaction</h3>
              <button
                onClick={() => {
                  setShowAddTransaction(false);
                  setErrorMessage('');
                }}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                ×
              </button>
            </div>
            {errorMessage && (
              <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex bg-white/10 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setTransactionData({ ...transactionData, type: 'income' })}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${transactionData.type === 'income'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                    }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionData({ ...transactionData, type: 'expense' })}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${transactionData.type === 'expense'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                    }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionData({ ...transactionData, type: 'savings' })}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${transactionData.type === 'savings'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                    }`}
                >
                  Savings
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionData({ ...transactionData, type: 'loan' })}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${transactionData.type === 'loan'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                    }`}
                >
                  Loan
                </button>
              </div>
              {transactionData.type !== 'savings' && transactionData.type !== 'loan' && (
                <input
                  type="number"
                  placeholder="Amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              )}
              {transactionData.type === 'savings' && (
                <input
                  type="number"
                  placeholder="Savings Amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={transactionData.savings}
                  onChange={(e) => setTransactionData({ ...transactionData, savings: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              )}
              {transactionData.type === 'loan' && (
                <>
                  <select
                    value={transactionData.loanAction}
                    onChange={(e) => setTransactionData({ ...transactionData, loanAction: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  >
                    <option value="">Select Loan Action</option>
                    <option value="take">Take Loan</option>
                    <option value="clear">Clear Loan</option>
                  </select>
                  {transactionData.loanAction === 'take' && (
                    <>
                      <select
                        value={transactionData.personType}
                        onChange={(e) => setTransactionData({ ...transactionData, personType: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      >
                        <option value="new">New Person</option>
                        <option value="existing">Existing Person</option>
                      </select>
                      {transactionData.personType === 'new' ? (
                        <input
                          type="text"
                          placeholder="Loan Name"
                          value={transactionData.loanName}
                          onChange={(e) => setTransactionData({ ...transactionData, loanName: e.target.value })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                          required
                        />
                      ) : (
                        <select
                          value={transactionData.loanId}
                          onChange={(e) => setTransactionData({ ...transactionData, loanId: e.target.value })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                          required
                        >
                          <option value="">Select Person</option>
                          {loans.map(loan => (
                            <option key={loan.id} value={loan.id}>
                              {loan.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        placeholder="Reason for Loan"
                        value={transactionData.description}
                        onChange={(e) => setTransactionData({ ...transactionData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Loan Amount"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={transactionData.amount}
                        onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      />
                      {transactionData.date !== new Date().toISOString().split('T')[0] && (
                        <input
                          type="time"
                          placeholder="Time"
                          value={transactionData.loanTime}
                          onChange={(e) => setTransactionData({ ...transactionData, loanTime: e.target.value })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                      )}
                    </>
                  )}
                  {transactionData.loanAction === 'clear' && (
                    <>
                      <select
                        value={transactionData.loanId}
                        onChange={(e) => setTransactionData({ ...transactionData, loanId: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      >
                        <option value="">Select Loan</option>
                        {loans.filter(loan => loan.remaining_amount > 0).map(loan => (
                          <option key={loan.id} value={loan.id}>
                            {loan.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Amount to Clear"
                        value={transactionData.amount}
                        onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      />
                      {transactionData.date !== new Date().toISOString().split('T')[0] && (
                        <input
                          type="time"
                          placeholder="Time"
                          value={transactionData.loanTime}
                          onChange={(e) => setTransactionData({ ...transactionData, loanTime: e.target.value })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                      )}
                    </>
                  )}
                </>
              )}
              {transactionData.type !== 'loan' && (
                <input
                  type="text"
                  placeholder="Description"
                  value={transactionData.description}
                  onChange={(e) => setTransactionData({ ...transactionData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              )}
              {transactionData.type !== 'savings' && transactionData.type !== 'loan' && (
                <select
                  value={transactionData.category}
                  onChange={(e) => setTransactionData({ ...transactionData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                >
                  <option value="">Select Category</option>
                  {transactionData.type === 'income' ? (
                    <>
                      <option key="job" value="Job">Job</option>
                      <option key="side-job" value="Side Job">Side Job</option>
                      <option key="investment" value="Investment">Investment</option>
                      <option key="other-income" value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option key="food" value="Food">Food</option>
                      <option key="transportation" value="Transportation">Transportation</option>
                      <option key="housing" value="Housing">Housing</option>
                      <option key="bills" value="Bills">Bills</option>
                      <option key="entertainment" value="Entertainment">Entertainment</option>
                      <option key="shopping" value="Shopping">Shopping</option>
                      <option key="healthcare" value="Healthcare">Healthcare</option>
                      <option key="other-expense" value="Other">Other</option>
                    </>
                  )}
                </select>
              )}
              <input
                type="date"
                value={transactionData.date}
                onChange={(e) => setTransactionData({ ...transactionData, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              {transactionData.date !== new Date().toISOString().split('T')[0] && (
                <input
                  type="time"
                  placeholder="Time"
                  value={transactionData.time}
                  onChange={(e) => setTransactionData({ ...transactionData, time: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTransaction(false);
                    setErrorMessage('');
                  }}
                  className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddMonthlyGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add Monthly Goal</h3>
              <button
                onClick={() => setShowAddMonthlyGoal(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddMonthlyGoal} className="space-y-4">
              <input
                type="number"
                placeholder="Amount to Save"
                inputMode="numeric"
                pattern="[0-9]*"
                value={monthlyGoalData.amount}
                onChange={(e) => setMonthlyGoalData({ ...monthlyGoalData, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <input
                type="text"
                placeholder="Goal Description"
                value={monthlyGoalData.description}
                onChange={(e) => setMonthlyGoalData({ ...monthlyGoalData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <select
                value={monthlyGoalData.target_date}
                onChange={(e) => setMonthlyGoalData({ ...monthlyGoalData, target_date: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              >
                {months.map(month => (
                  <option key={month.value} value={`${new Date().getFullYear()}-${month.value}`}>
                    {month.label}
                  </option>
                ))}
              </select>
              <div className="w-full">
                <label className="text-white/60 text-sm mb-1 block">
                  Priority
                </label>
                <input
                  type="number"
                  placeholder="Priority (1 being highest)"
                  value={monthlyGoalData.priority}
                  onChange={(e) => setMonthlyGoalData({
                    ...monthlyGoalData,
                    priority: e.target.value === "" ? "" : Number(e.target.value)
                  })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMonthlyGoal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddYearlyGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add Yearly Goal</h3>
              <button
                onClick={() => setShowAddYearlyGoal(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddYearlyGoal} className="space-y-4">
              <input
                type="number"
                placeholder="Amount to Save"
                inputMode="numeric"
                pattern="[0-9]*"
                value={yearlyGoalData.amount}
                onChange={(e) => setYearlyGoalData({ ...yearlyGoalData, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <input
                type="text"
                placeholder="Goal Description"
                value={yearlyGoalData.description}
                onChange={(e) => setYearlyGoalData({ ...yearlyGoalData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <input
                type="number"
                placeholder="Target Year"
                value={yearlyGoalData.target_date}
                onChange={(e) => setYearlyGoalData({ ...yearlyGoalData, target_date: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <div className="w-full">
                <label className="text-white/60 text-sm mb-1 block">
                  Priority
                </label>
                <input
                  type="number"
                  placeholder="Priority (1 being highest)"
                  value={yearlyGoalData.priority}
                  onChange={(e) => setYearlyGoalData({
                    ...yearlyGoalData,
                    priority: e.target.value === "" ? "" : Number(e.target.value)
                  })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddYearlyGoal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAccountSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Account Settings</h3>
              <button
                onClick={() => setShowAccountSettings(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={accountData.name}
                onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={accountData.email}
                onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Current Password"
                  value={accountData.currentPassword}
                  onChange={(e) => setAccountData({ ...accountData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <input
                type="password"
                placeholder="New Password"
                value={accountData.newPassword}
                onChange={(e) => setAccountData({ ...accountData, newPassword: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={accountData.confirmNewPassword}
                onChange={(e) => setAccountData({ ...accountData, confirmNewPassword: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAccountSettings(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  Update Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Delete Account</h3>
              <button
                onClick={() => setShowDeleteAccount(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <p className="text-white/70">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccount(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-500/30 text-red-400 rounded-2xl font-medium hover:bg-red-500/40 transition-all shadow-lg"
                >
                  Delete Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showSuccessDialog && (
        <SuccessDialog
          message={successMessage}
          onClose={() => setShowSuccessDialog(false)}
        />
      )}
    </div>
  );
};

export default FinanceTracker;
