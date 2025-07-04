import React, { useState, useEffect } from 'react';

// --- Helper Icon Components ---
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);
const ChevronRightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>);
const UploadIcon = () => (<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>);

// --- API Service ---
const API_BASE_URL = 'https://backend-rnii.onrender.com/api';

const api = {
  async request(endpoint, { body, ...customConfig } = {}) {
    const token = localStorage.getItem('divvy_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const config = {
      method: body ? 'POST' : 'GET',
      ...customConfig,
      headers: {
        ...headers,
        ...customConfig.headers,
      },
    };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'An API error occurred');
    }
    return data;
  },
  register(body) {
    return this.request('/auth/register', { body });
  },
  login(body) {
    return this.request('/auth/login', { body });
  },
  getGroups() {
    return this.request('/user/groups');
  },
  getPendingInvites() {
    return this.request('/user/groups/invites');
  },
  acceptInvite(groupId) {
    return this.request(`/user/groups/${groupId}/accept`, { method: 'POST' });
  },
  rejectInvite(groupId) {
    return this.request(`/user/groups/${groupId}/reject`, { method: 'POST' });
  },
};


function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('divvy_token');
    const userData = localStorage.getItem('divvy_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setPage('dashboard');
    } else {
      setPage('signin');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData.user);
    localStorage.setItem('divvy_token', userData.token);
    localStorage.setItem('divvy_user', JSON.stringify(userData.user));
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('divvy_token');
    localStorage.removeItem('divvy_user');
    setPage('signin');
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setPage('groupDetail');
  }

  const handleSelectBalance = (balance) => {
    setSelectedBalance(balance);
    setPage('balanceDetail');
  }

  const handleSelectExpense = (expense) => {
    setSelectedExpense(expense);
    setPage('expenseDetail');
  }

  const renderPage = () => {
    if (page === 'loading') return <div className="loading-text">Loading...</div>;

    if (user) {
      switch(page) {
        case 'dashboard':
          return <DashboardScreen user={user} onGoToProfile={() => setPage('profile')} onGoToCreateGroup={() => setPage('createGroup')} onSelectGroup={handleSelectGroup} />;
        case 'profile':
          return <ProfileScreen user={user} onBack={() => setPage('dashboard')} onLogout={handleLogout} />;
        case 'createGroup':
          return <CreateGroupScreen onBack={() => setPage('dashboard')} />;
        case 'groupDetail':
          return <GroupDetailScreen group={selectedGroup} onBack={() => setPage('dashboard')} onGoToRecordPayment={() => setPage('recordPayment')} onSelectBalance={handleSelectBalance} onGoToAddExpense={() => setPage('addExpense')} onGoToInvite={() => setPage('invite')} onSelectExpense={handleSelectExpense} />;
        case 'recordPayment':
          return <RecordPaymentScreen group={selectedGroup} onBack={() => setPage('groupDetail')} />;
        case 'balanceDetail':
          return <BalanceDetailScreen balance={selectedBalance} onBack={() => setPage('groupDetail')} />;
        case 'addExpense':
            return <AddExpenseScreen group={selectedGroup} onBack={() => setPage('groupDetail')} />;
        case 'expenseDetail':
            return <ExpenseDetailScreen expense={selectedExpense} onBack={() => setPage('groupDetail')} />;
        case 'invite':
            return <InviteScreen group={selectedGroup} onBack={() => setPage('groupDetail')} />;
        default:
          return <DashboardScreen user={user} onGoToProfile={() => setPage('profile')} onGoToCreateGroup={() => setPage('createGroup')} onSelectGroup={handleSelectGroup} />;
      }
    }

    switch (page) {
      case 'signin':
        return <SignInScreen onGoToSignUp={() => setPage('signup')} onLoginSuccess={handleLoginSuccess} />;
      case 'signup':
        return <SignUpScreen onGoToSignIn={() => setPage('signin')} onLoginSuccess={handleLoginSuccess} />;
      default:
        return <SignInScreen onGoToSignUp={() => setPage('signup')} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="page-container">
      <div className="phone-screen">
        {renderPage()}
      </div>
    </div>
  );
}

// --- Authentication Screens ---
function SignInScreen({ onGoToSignUp, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login({ email, password });
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="title">Mates</h1>
      <p className="subtitle">Split bills, not friendships.</p>
      <form className="form-container" onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}
        <input className="input" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" style={{marginBottom: '1.5rem'}} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="button" type="submit" disabled={isLoading}>{isLoading ? 'Signing In...' : 'SIGN IN'}</button>
        <p className="form-footer-text">Don't have an account? <button className="link-button" type="button" onClick={onGoToSignUp}>Sign Up</button></p>
      </form>
    </div>
  );
}
function SignUpScreen({ onGoToSignIn, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.register({ username, email, password });
      const loginData = await api.login({ email, password });
      onLoginSuccess(loginData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="title">Create Account</h1>
      <p className="subtitle">Join Mates and start sharing.</p>
      <form className="form-container" onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}
        <input className="input" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" style={{marginBottom: '1.5rem'}} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="button" type="submit" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'SIGN UP'}</button>
        <p className="form-footer-text">Already have an account? <button className="link-button" type="button" onClick={onGoToSignIn}>Sign In</button></p>
      </form>
    </div>
  );
}

// --- Main App Screens ---
function DashboardScreen({ user, onGoToProfile, onGoToCreateGroup, onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [groupsData, invitesData] = await Promise.all([
        api.getGroups(),
        api.getPendingInvites()
      ]);
      setGroups(groupsData);
      setInvites(invitesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (groupId) => {
    await api.acceptInvite(groupId);
    fetchData(); // Refresh data
  };

  const handleReject = async (groupId) => {
    await api.rejectInvite(groupId);
    fetchData(); // Refresh data
  };

  return (
    <div className="screen-container">
      <header className="dashboard-header">
        <h1 className="dashboard-header-title">Mates</h1>
        <button onClick={onGoToProfile}><img src={user.avatar} alt="User Avatar" className="dashboard-avatar" /></button>
      </header>
      <main className="screen-main">
        {isLoading ? (<p className="loading-text">Loading...</p>) : (
          <>
            {invites.length > 0 && (
              <div className="mb-8">
                <h2 className="groups-header">Pending Invites</h2>
                <div className="invite-list">
                  {invites.map(invite => (
                    <div key={invite._id} className="invite-item justify-between">
                      <p>{invite.name}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(invite._id)} className="button" style={{width:'auto', padding:'0.5rem 1rem'}}>Accept</button>
                        <button onClick={() => handleReject(invite._id)} className="button" style={{width:'auto', padding:'0.5rem 1rem', backgroundColor: 'var(--color-danger)'}}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h2 className="groups-header">My Groups</h2>
            <div className="group-list">{groups.map(group => (<button key={group._id} className="group-item" onClick={() => onSelectGroup(group)}><div className="group-item-content"><p className="group-name">{group.name}</p></div><ChevronRightIcon /></button>))}</div>
          </>
        )}
      </main>
      <footer className="screen-footer"><button onClick={onGoToCreateGroup} className="create-group-button"><PlusIcon /><span>Create New Group</span></button></footer>
    </div>
  );
}

// Other components (ProfileScreen, CreateGroupScreen, etc.) remain largely the same
// as they don't fetch data directly in this version.
function ProfileScreen({ user, onBack, onLogout }) {
  return (
    <div className="screen-container">
        <header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button><h1 className="screen-header-title">Profile</h1><div></div></header>
        <main className="auth-container">
            <img src={user.avatar} alt="User Avatar" style={{width: 80, height: 80, borderRadius: '50%', marginBottom: '1rem'}}/>
            <h1 className="title" style={{fontSize: '2rem'}}>{user.username}</h1>
            <p className="subtitle" style={{marginBottom: '2rem'}}>{user.email}</p>
            <div className="form-container">
                <button className="button" style={{backgroundColor: '#6b7280', marginTop: '1rem'}} onClick={onLogout}>LOG OUT</button>
            </div>
        </main>
    </div>
  );
}

function CreateGroupScreen({ onBack }) {
    const [invitedMembers, setInvitedMembers] = useState([]);

    const handleInvite = (user) => {
        if (!invitedMembers.find(m => m.id === user.id)) {
            setInvitedMembers([...invitedMembers, user]);
        }
    }

    return (
    <div className="screen-container">
        <header className="screen-header"><button onClick={onBack} className="screen-header-button">Cancel</button><h1 className="screen-header-title">Create Group</h1><button className="screen-header-button">Create</button></header>
        <main className="screen-main">
            <form className="form-container" style={{maxWidth: 'none', textAlign: 'left'}}>
                <label className="form-label">Group Name</label>
                <input className="input" type="text" placeholder="e.g., Elm Street Flat" style={{textAlign: 'left'}} />
                <label className="form-label" style={{marginTop: '1.5rem'}}>Invite Members</label>
                <input className="input" type="text" placeholder="Search by username or email" style={{textAlign: 'left'}} />
                <div className="settlement-list">
                    {MOCK_USERS_SEARCH.map(user => (
                        <div key={user.id} className="settlement-item" style={{cursor: 'default', justifyContent: 'space-between'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <img src={user.avatar} alt={user.name} className="member-avatar" />
                                <span style={{fontWeight: 'bold'}}>{user.name}</span>
                            </div>
                            <button type="button" onClick={() => handleInvite(user)} className="button" style={{width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem'}}>Invite</button>
                        </div>
                    ))}
                </div>
                {invitedMembers.length > 0 && (
                <><h3 className="groups-header" style={{marginTop: '2rem'}}>Invited</h3><div className="member-list">{invitedMembers.map(member => (<img key={member.id} src={member.avatar} alt={member.name} className="member-avatar" title={member.name} />))}</div></>
                )}
            </form>
        </main>
    </div>
    );
}

function GroupDetailScreen({ group, onBack, onGoToRecordPayment, onSelectBalance, onGoToAddExpense, onSelectExpense, onGoToInvite }) {
    const [activeTab, setActiveTab] = useState('expenses');
    const renderTabContent = () => {
        if (activeTab === 'balances') { return <BalancesView balances={group.balances} onSelectBalance={onSelectBalance} />; }
        if (activeTab === 'settleUp') { return <SettleUpView settlements={group.settlements} onGoToRecordPayment={onGoToRecordPayment} />; }
        if (activeTab === 'whiteboard') { return <WhiteboardView initialItems={group.whiteboard} />; }
        return <ExpensesView expenses={group.expenses} onSelectExpense={onSelectExpense} />;
    }
    return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button><h1 className="screen-header-title">{group.name}</h1><button onClick={onGoToInvite} className="screen-header-button">Invite</button></header>
            <div className="group-detail-members"><h3 className="groups-header">Members</h3><div className="member-list">{group.members.map(member => (<img key={member.id} src={member.avatar} alt={member.name} className="member-avatar" title={member.name} />))}</div></div>
            <nav className="tab-nav">
                <button className={activeTab === 'expenses' ? 'tab-button-active' : 'tab-button'} onClick={() => setActiveTab('expenses')}>Expenses</button>
                <button className={activeTab === 'balances' ? 'tab-button-active' : 'tab-button'} onClick={() => setActiveTab('balances')}>Balances</button>
                <button className={activeTab === 'settleUp' ? 'tab-button-active' : 'tab-button'} onClick={() => setActiveTab('settleUp')}>Settle Up</button>
                <button className={activeTab === 'whiteboard' ? 'tab-button-active' : 'tab-button'} onClick={() => setActiveTab('whiteboard')}>Whiteboard</button>
            </nav>
            <main className="screen-main">{renderTabContent()}</main>
            <footer className="screen-footer"><button className="button" onClick={onGoToAddExpense}><PlusIcon /> Add Expense</button></footer>
        </div>
    );
}

function ExpensesView({ expenses, onSelectExpense }) {
    return (<div className="expense-list">{expenses.length > 0 ? expenses.map(exp => (<button key={exp.id} className="expense-item" onClick={() => onSelectExpense(exp)}><div className="expense-item-content"><p className="expense-description">{exp.description}</p><p className="expense-details">{exp.payer} paid ${exp.total.toFixed(2)}</p></div></button>)) : <p className="empty-text">No expenses yet.</p>}</div>);
}

function BalancesView({ balances, onSelectBalance }) {
    return (<div className="balance-list">{balances.length > 0 ? balances.map((bal, index) => { const isOwedToYou = bal.to === 'You'; return (<button key={index} className="balance-item" onClick={() => onSelectBalance(bal)}>{isOwedToYou ? (<p className="balance-text"><span style={{fontWeight: 'bold'}}>{bal.from}</span> owes you <span className="text-owed">${bal.amount.toFixed(2)}</span></p>) : (<p className="balance-text">You owe <span style={{fontWeight: 'bold'}}>{bal.to}</span> <span className="text-owes">${bal.amount.toFixed(2)}</span></p>)}</button>)}) : <p className="empty-text">Everyone is settled up!</p>}</div>);
}

function SettleUpView({ settlements, onGoToRecordPayment }) {
    return (<div className="settlement-list"><button onClick={onGoToRecordPayment} className="button" style={{backgroundColor: 'var(--color-secondary)', marginBottom: '1.5rem'}}>Record a Payment</button><h3 className="groups-header">History</h3>{settlements.length > 0 ? settlements.map((settle, index) => (<div key={index} className="settlement-item" style={{cursor: 'default'}}><p className="settlement-text"><span style={{fontWeight: 'bold'}}>{settle.from}</span> paid <span style={{fontWeight: 'bold'}}>{settle.to}</span> <span style={{fontWeight: 'bold'}}>${settle.amount.toFixed(2)}</span></p></div>)) : <p className="empty-text">No settlements recorded yet.</p>}</div>);
}

function RecordPaymentScreen({ group, onBack }) {
    const [amount, setAmount] = useState('');
    const [receiptName, setReceiptName] = useState('');
    const debts = group.balances.filter(b => b.from === 'You');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptName(e.target.files[0].name);
        }
    };

    return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">Cancel</button><h1 className="screen-header-title">Record a Payment</h1><button className="screen-header-button">Save</button></header>
            <main className="screen-main">
            <form className="form-container" style={{maxWidth: 'none', textAlign: 'left'}}>
                <label className="form-label">You paid...</label>
                <select className="input select" style={{textAlign: 'left'}}>
                    {debts.length > 0 ? debts.map(debt => <option key={debt.to} value={debt.to}>{debt.to}</option>) : <option disabled>No one to pay</option>}
                </select>
                <label className="form-label">Amount</label>
                <input className="input" style={{textAlign: 'left'}} type="number" placeholder="$0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="portion-buttons">
                    <button type="button" className="portion-button" onClick={() => setAmount((debts[0]?.amount * 0.25).toFixed(2))}>25%</button>
                    <button type="button" className="portion-button" onClick={() => setAmount((debts[0]?.amount * 0.50).toFixed(2))}>50%</button>
                    <button type="button" className="portion-button" onClick={() => setAmount(debts[0]?.amount.toFixed(2))}>100%</button>
                </div>
                <label className="form-label" style={{marginTop: '1rem'}}>Attach Receipt (Optional)</label>
                 <label className="file-upload-box"><UploadIcon /><p>Click to upload</p><input type="file" onChange={handleFileChange}/></label>
                 {receiptName && <p className="file-upload-success-text">Attached: {receiptName}</p>}
            </form>
            </main>
        </div>
    );
}

function AddExpenseScreen({ group, onBack }) {
     const [receiptName, setReceiptName] = useState('');
     const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptName(e.target.files[0].name);
        }
    };

     return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">Cancel</button><h1 className="screen-header-title">Add an Expense</h1><button className="screen-header-button">Save</button></header>
            <main className="screen-main">
             <form className="form-container" style={{maxWidth: 'none', textAlign: 'left'}}>
                <label className="form-label">Description</label>
                <input className="input" type="text" placeholder="e.g., Groceries" style={{textAlign: 'left'}} />
                 <label className="form-label">Amount</label>
                <input className="input" type="number" placeholder="$0.00" style={{textAlign: 'left'}}/>
                 <label className="form-label">Paid by</label>
                 <select className="input select" style={{textAlign: 'left'}}>
                    {group.members.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}
                </select>
                <label className="form-label" style={{marginTop: '1rem'}}>Attach Bill (Optional)</label>
                <label className="file-upload-box"><UploadIcon /><p>Click to upload</p><input type="file" onChange={handleFileChange}/></label>
                {receiptName && <p className="file-upload-success-text">Attached: {receiptName}</p>}
            </form>
            </main>
        </div>
    )
}

function BalanceDetailScreen({ balance, onBack }) {
    const isOwedToYou = balance.to === 'You';
    return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button><h1 className="screen-header-title">Balance Details</h1><div></div></header>
            <main className="screen-main">
                <div className="balance-container">
                    {isOwedToYou ? (<p className="balance-amount"><span style={{fontWeight:'normal'}}>{balance.from} owes you </span><span className="text-owed">${balance.amount.toFixed(2)}</span></p>)
                                 : (<p className="balance-amount">You owe <span style={{fontWeight:'normal'}}>{balance.to} </span><span className="text-owes">${balance.amount.toFixed(2)}</span></p>)}
                </div>
                <h3 className="groups-header">Breakdown from Expenses</h3>
                <div className="expense-list">
                    {balance.details.map((item, index) => (
                        <div key={index} className="expense-item" style={{cursor: 'default'}}>
                            <div className="expense-item-content">
                                <p className="expense-description">{item.desc}</p>
                            </div>
                            <span className={isOwedToYou ? "text-owed" : "text-owes"}>${item.amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

function ExpenseDetailScreen({ expense, onBack }) {
    return (
        <div className="screen-container">
            <header className="screen-header">
                <button onClick={onBack} className="screen-header-button">&lt; Back</button>
                <h1 className="screen-header-title">Expense Details</h1>
                <button className="screen-header-button" style={{color: 'var(--color-danger)'}}>Delete</button>
            </header>
            <main className="screen-main">
                <div className="balance-container" style={{marginBottom: '1.5rem', textAlign: 'left'}}>
                    <p className="balance-label">{expense.category}</p>
                    <h2 className="balance-amount" style={{fontSize: '2.25rem'}}>{expense.description}</h2>
                    <p className="title" style={{fontSize: '3rem', margin: '0.5rem 0'}}>${expense.total.toFixed(2)}</p>
                    <p className="balance-label">Paid by {expense.payer} on {expense.date}</p>
                </div>

                {expense.attachmentUrl && (
                    <div style={{marginBottom: '1.5rem'}}>
                        <h3 className="groups-header">Receipt</h3>
                        <img src={expense.attachmentUrl} alt="Receipt" style={{width: '100%', borderRadius: '0.5rem', border: '1px solid var(--color-border)'}}
                             onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x800/eee/ccc?text=Image+Not+Found'; }} />
                    </div>
                )}

                <div>
                     <h3 className="groups-header">Split Between</h3>
                     <div className="expense-list">
                        {expense.involved.map((person, index) => (
                            <div key={index} className="expense-item" style={{cursor: 'default', justifyContent: 'space-between'}}>
                                <p className="expense-description">{person}</p>
                                <span className="text-owes">${(expense.total / expense.involved.length).toFixed(2)}</span>
                            </div>
                        ))}
                     </div>
                </div>
            </main>
        </div>
    );
}

function InviteScreen({ group, onBack }) {
    return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button><h1 className="screen-header-title">Invite to {group.name}</h1><div></div></header>
            <main className="screen-main">
                <form className="form-container" style={{maxWidth: 'none', textAlign: 'left'}}>
                    <label className="form-label">Search by username or email</label>
                    <input className="input" type="text" placeholder="e.g., sarah@example.com" style={{textAlign: 'left'}} />
                    <button className="button" type="button" style={{backgroundColor: 'var(--color-secondary)'}}>Search</button>
                </form>

                <div className="settlement-list" style={{marginTop: '2rem'}}>
                    <h3 className="groups-header">Search Results</h3>
                    {MOCK_USERS_SEARCH.map(user => (
                        <div key={user.id} className="invite-item" style={{cursor: 'default', justifyContent: 'space-between'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <img src={user.avatar} alt={user.name} className="member-avatar" />
                                <span style={{fontWeight: 'bold'}}>{user.name}</span>
                            </div>
                            <button type="button" className="button" style={{width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem'}}>Invite</button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

function WhiteboardView({ initialItems }) {
    const [items, setItems] = useState(initialItems);
    const [newItemText, setNewItemText] = useState('');

    const handleToggleItem = (id) => {
        setItems(items.map(item => 
            item.id === id ? { ...item, completed: !item.completed } : item
        ));
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!newItemText.trim()) return;
        const newItem = {
            id: Date.now(),
            text: newItemText,
            completed: false
        };
        setItems([...items, newItem]);
        setNewItemText('');
    };

    return (
        <div>
            <div className="whiteboard-list">
                {items.map(item => (
                    <div key={item.id} className="whiteboard-item" onClick={() => handleToggleItem(item.id)}>
                        <input 
                            type="checkbox" 
                            className="whiteboard-checkbox"
                            checked={item.completed}
                            readOnly
                        />
                        <span className={item.completed ? 'whiteboard-text-completed' : 'whiteboard-text'}>
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>
            <form className="add-item-form" onSubmit={handleAddItem}>
                <input 
                    type="text" 
                    className="input" 
                    style={{textAlign: 'left', flexGrow: 1}}
                    placeholder="Add an item..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                />
                <button className="button" type="submit" style={{width: 'auto'}}>Add</button>
            </form>
        </div>
    );
}


export default App;
