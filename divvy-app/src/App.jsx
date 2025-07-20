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
    const headers = {};
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const config = {
      method: body ? 'POST' : 'GET',
      ...customConfig,
      headers: { ...headers, ...customConfig.headers },
    };

    if (body) {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'An API error occurred');
    }
    return data;
  },
  register(body) { return this.request('/auth/register', { body }); },
  login(body) { return this.request('/auth/login', { body }); },
  getGroups() { return this.request('/user/groups'); },
  createGroup(body) { return this.request('/user/groups', { body }); },
  getGroupDetails(groupId) { return this.request(`/groups/${groupId}`); },
  getGroupExpenses(groupId) { return this.request(`/expenses/group/${groupId}`); },
  getExpenseDetails(groupId, expenseId) { return this.request(`/expenses/${groupId}/expense/${expenseId}`); },
  getGroupSummary(groupId) { return this.request(`/groups/${groupId}/summary/raw`); },
  getPendingInvites() { return this.request('/user/groups/invites'); },
  acceptInvite(inviteId) { return this.request(`/user/groups/${inviteId}/accept`, { method: 'POST' }); },
  rejectInvite(inviteId) { return this.request(`/user/groups/${inviteId}/reject`, { method: 'POST' }); },
  addExpense(body) { return this.request('/expenses', { body, method: 'POST' }); },
};

// --- Helper Function ---
const getDefaultAvatar = (name) => {
    const initial = name ? name.charAt(0).toUpperCase() : 'U';
    return `https://placehold.co/100x100/A3E635/1E293B?text=${initial}`;
};

function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('divvy_token');
    const userData = localStorage.getItem('divvy_user');
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser.avatar) {
            parsedUser.avatar = getDefaultAvatar(parsedUser.username || parsedUser.email);
        }
        setUser(parsedUser);
        setPage('dashboard');
      } catch (error) {
        handleLogout();
      }
    } else {
      setPage('signin');
    }
  }, []);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
        setNotification(null);
    }, 3000);
  };

  const handleLoginSuccess = (data) => {
    const userToSave = data.user;
    if (!userToSave.avatar) {
        userToSave.avatar = getDefaultAvatar(userToSave.username || userToSave.email);
    }
    setUser(userToSave);
    localStorage.setItem('divvy_token', data.token);
    localStorage.setItem('divvy_user', JSON.stringify(userToSave));
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('divvy_token');
    localStorage.removeItem('divvy_user');
    setPage('signin');
  };

  const navigateTo = (pageName, data = null) => {
      setPageData(data);
      setPage(pageName);
  }

  const renderPage = () => {
    if (page === 'loading') return <div className="loading-text">Loading App...</div>;

    if (user) {
      switch(page) {
        case 'dashboard':
          return <DashboardScreen user={user} onGoToProfile={() => navigateTo('profile')} onGoToCreateGroup={() => navigateTo('createGroup')} onSelectGroup={(group) => navigateTo('groupDetail', group)} />;
        case 'profile':
          return <ProfileScreen user={user} onBack={() => navigateTo('dashboard')} onLogout={handleLogout} />;
        case 'createGroup':
          return <CreateGroupScreen onGroupCreated={() => navigateTo('dashboard')} onBack={() => navigateTo('dashboard')} />;
        case 'groupDetail':
          return <GroupDetailScreen user={user} group={pageData} onBack={() => navigateTo('dashboard')} navigateTo={navigateTo} />;
        case 'addExpense':
            return <AddExpenseScreen group={pageData} onBack={() => navigateTo('groupDetail', pageData)} showNotification={showNotification} user={user} />;
        case 'expenseDetail':
            return <ExpenseDetailScreen expense={pageData} onBack={() => navigateTo('groupDetail', { _id: pageData.group })} />;
        default:
          return <DashboardScreen user={user} onGoToProfile={() => navigateTo('profile')} onGoToCreateGroup={() => navigateTo('createGroup')} onSelectGroup={(group) => navigateTo('groupDetail', group)} />;
      }
    }

    switch (page) {
      case 'signin':
        return <SignInScreen onGoToSignUp={() => navigateTo('signup')} onLoginSuccess={handleLoginSuccess} />;
      case 'signup':
        return <SignUpScreen onGoToSignIn={() => navigateTo('signin')} onLoginSuccess={handleLoginSuccess} />;
      default:
        return <SignInScreen onGoToSignUp={() => navigateTo('signup')} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="page-container">
      <div className="phone-screen">
        {notification && <div className="notification-banner">{notification}</div>}
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
        {error && <p className="error-text" style={{color: 'var(--color-danger)', marginBottom: '1rem'}}>{error}</p>}
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
        {error && <p className="error-text" style={{color: 'var(--color-danger)', marginBottom: '1rem'}}>{error}</p>}
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
  const [error, setError] = useState(null);

  const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [groupsResponse, invitesResponse] = await Promise.all([
          api.getGroups(),
          api.getPendingInvites()
        ]);
        
        setGroups(Array.isArray(groupsResponse.groups) ? groupsResponse.groups : []);
        setInvites(Array.isArray(invitesResponse) ? invitesResponse : []);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (inviteId) => {
    try {
        await api.acceptInvite(inviteId);
        fetchData(); 
    } catch (error) {
        alert(`Failed to accept invite: ${error.message}`);
    }
  };

  const handleReject = async (inviteId) => {
     try {
        await api.rejectInvite(inviteId);
        fetchData();
    } catch (error) {
        alert(`Failed to reject invite: ${error.message}`);
    }
  };

  return (
    <div className="screen-container">
      <header className="dashboard-header">
        <h1 className="dashboard-header-title">Mates</h1>
        <button onClick={onGoToProfile}><img src={user.avatar} alt="User Avatar" className="dashboard-avatar" /></button>
      </header>
      <main className="screen-main">
        {isLoading ? (<p className="loading-text">Loading...</p>) : 
         error ? (<p className="error-text" style={{color: 'var(--color-danger)', textAlign: 'center'}}>{error}</p>) :
        (
          <>
            {invites.length > 0 && (
              <div style={{marginBottom: '2rem'}}>
                <h2 className="groups-header">Pending Invites</h2>
                <div className="invite-list">
                  {invites.map(invite => (
                    <div key={invite._id} className="invite-item" style={{justifyContent: 'space-between'}}>
                      <p>Invite to <strong>{invite.group.name}</strong></p>
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button onClick={() => handleAccept(invite._id)} className="button" style={{width:'auto', padding:'0.5rem 1rem'}}>Accept</button>
                        <button onClick={() => handleReject(invite._id)} className="button" style={{width:'auto', padding:'0.5rem 1rem', backgroundColor: 'var(--color-danger)'}}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h2 className="groups-header">My Groups</h2>
            <div className="group-list">{groups.length > 0 ? groups.map(group => (<button key={group._id} className="group-item" onClick={() => onSelectGroup(group)}><div className="group-item-content"><p className="group-name">{group.name}</p></div><ChevronRightIcon /></button>)) : <p className="empty-text">No groups yet. Create one!</p>}</div>
          </>
        )}
      </main>
      <footer className="screen-footer"><button onClick={onGoToCreateGroup} className="create-group-button"><PlusIcon /><span>Create New Group</span></button></footer>
    </div>
  );
}

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

function CreateGroupScreen({ onBack, onGroupCreated }) {
    const [groupName, setGroupName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!groupName.trim()) {
            alert('Please enter a group name.');
            return;
        }
        setIsLoading(true);
        try {
            await api.createGroup({ name: groupName });
            onGroupCreated();
        } catch (error) {
            alert(`Failed to create group: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
    <div className="screen-container">
        <header className="screen-header">
            <button onClick={onBack} className="screen-header-button">Cancel</button>
            <h1 className="screen-header-title">Create Group</h1>
            <button onClick={handleCreate} className="screen-header-button" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create'}
            </button>
        </header>
        <main className="screen-main">
            <form className="form-container" style={{maxWidth: 'none', textAlign: 'left'}} onSubmit={handleCreate}>
                <label className="form-label">Group Name</label>
                <input 
                    className="input" 
                    type="text" 
                    placeholder="e.g., Elm Street Flat" 
                    style={{textAlign: 'left'}}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
            </form>
        </main>
    </div>
    );
}

function GroupDetailScreen({ user, group, onBack, navigateTo }) {
    const [activeTab, setActiveTab] = useState('expenses');
    const [groupDetails, setGroupDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [details, summary, expenses] = await Promise.all([
                api.getGroupDetails(group._id),
                api.getGroupSummary(group._id),
                api.getGroupExpenses(group._id)
            ]);
            setGroupDetails({ ...details, summary, expenses: expenses.expenses });
        } catch (error) {
            console.error("Failed to fetch group details", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [group._id]);

    if (isLoading) return <div className="screen-container"><header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button></header><div className="loading-text">Loading Group...</div></div>;
    if (error) return <div className="screen-container"><header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button></header><div className="empty-text" style={{color: 'var(--color-danger)'}}>Error: {error}</div></div>;
    if (!groupDetails) return <div className="screen-container"><header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button></header><div className="empty-text">Could not load group.</div></div>;

    const renderTabContent = () => {
        if (activeTab === 'balances') { return <BalancesView summary={groupDetails.summary} user={user} />; }
        return <ExpensesView expenses={groupDetails.expenses} members={groupDetails.members} user={user} onSelectExpense={(exp) => navigateTo('expenseDetail', exp)} />;
    }

    return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">&lt; Back</button><h1 className="screen-header-title">{groupDetails.name}</h1><button className="screen-header-button">Invite</button></header>
            <div className="group-detail-members"><h3 className="groups-header">Members</h3><div className="member-list">{groupDetails.members.map(member => (<img key={member._id} src={member.avatar || getDefaultAvatar(member.username)} alt={member.username} className="member-avatar" title={member.username} />))}</div></div>
            <nav className="tab-nav"><button className={activeTab === 'expenses' ? 'tab-button-active' : 'tab-button'} onClick={() => setActiveTab('expenses')}>Expenses</button><button className={activeTab === 'balances' ? 'tab-button-active' : 'tab-button'} onClick={() => setActiveTab('balances')}>Balances</button></nav>
            <main className="screen-main">{renderTabContent()}</main>
            <footer className="screen-footer"><button className="button" onClick={() => navigateTo('addExpense', groupDetails)}><PlusIcon /> Add Expense</button></footer>
        </div>
    );
}


function ExpensesView({ expenses, members, user, onSelectExpense }) {
    const getPayerName = (expense) => {
        if (!expense.contributors || expense.contributors.length === 0) return 'Unknown';
        
        const payerNames = expense.contributors.map(c => {
            const member = members.find(m => m._id === c.user._id);
            return member ? (member._id === user._id ? 'You' : member.username) : 'Unknown';
        });

        if (payerNames.length === 1) {
            return payerNames[0];
        } else if (payerNames.length > 1) {
            const userIndex = payerNames.indexOf('You');
            if (userIndex !== -1) {
                return `You & ${payerNames.length - 1} other${payerNames.length > 2 ? 's' : ''}`;
            }
            return `${payerNames[0]} & others`;
        }
        return 'Unknown';
    };

    return (
        <div className="expense-list">
            {expenses && expenses.length > 0 ? expenses.map(exp => (
                <button key={exp._id} className="expense-item" onClick={() => onSelectExpense(exp)}>
                    <div className="expense-item-content">
                        <p className="expense-description">{exp.description}</p>
                        <p className="expense-details">{getPayerName(exp)} paid ${exp.amount.toFixed(2)}</p>
                    </div>
                </button>
            )) : <p className="empty-text">No expenses yet.</p>}
        </div>
    );
}

function BalancesView({ summary, user }) {
    const { youOwe, owedToYou, othersOweEachOther } = summary;

    return (
        <div className="balance-list">
            {(youOwe.length === 0 && owedToYou.length === 0 && othersOweEachOther.length === 0) && <p className="empty-text">Everyone is settled up!</p>}
            
            {youOwe.map((bal, index) => (
                <button key={`owe-${index}`} className="balance-item">
                    <p className="balance-text">You owe <span style={{fontWeight: 'bold'}}>{bal.toName}</span> <span className="text-owes">${bal.amount.toFixed(2)}</span></p>
                </button>
            ))}

            {owedToYou.map((bal, index) => (
                 <button key={`owed-${index}`} className="balance-item">
                    <p className="balance-text"><span style={{fontWeight: 'bold'}}>{bal.fromName}</span> owes you <span className="text-owed">${bal.amount.toFixed(2)}</span></p>
                </button>
            ))}

            {othersOweEachOther.length > 0 && (
                <>
                    <h3 className="groups-header" style={{marginTop: '1.5rem'}}>Other Balances</h3>
                    {othersOweEachOther.map((bal, index) => (
                        <div key={`other-${index}`} className="balance-item" style={{cursor: 'default'}}>
                            <p className="balance-text"><span style={{fontWeight: 'bold'}}>{bal.fromName}</span> owes <span style={{fontWeight: 'bold'}}>{bal.toName}</span> <span className="text-owes">${bal.amount.toFixed(2)}</span></p>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

function AddExpenseScreen({ group, onBack, showNotification, user }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [splitType, setSplitType] = useState('equal');
    const [splits, setSplits] = useState({});
    const [contributors, setContributors] = useState([{ user: user._id, amount: '' }]);
    const [isLoading, setIsLoading] = useState(false);
    const [receiptFile, setReceiptFile] = useState(null);
    const [participants, setParticipants] = useState(() => group.members.map(m => m._id));

    useEffect(() => {
        const initialSplits = {};
        group.members.forEach(member => {
            initialSplits[member._id] = '';
        });
        setSplits(initialSplits);
    }, [group.members]);
    
    useEffect(() => {
        if (contributors.length === 1) {
            setContributors(prev => [{ ...prev[0], amount: amount || '' }]);
        } else {
            const total = contributors.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            setAmount(total > 0 ? total.toFixed(2) : '');
        }
    }, [amount]);

    const handleAmountChange = (e) => {
        setAmount(e.target.value);
    }

    const handleSplitChange = (userId, value) => {
        setSplits(prev => ({ ...prev, [userId]: value }));
    };

    const handleContributorChange = (index, field, value) => {
        const newContributors = [...contributors];
        newContributors[index][field] = value;
        setContributors(newContributors);
    };

    const addContributor = () => {
        setContributors([...contributors, { user: '', amount: '' }]);
    };
    
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description || !amount) {
            alert("Please fill out description and amount.");
            return;
        }

        const finalContributors = contributors.map(c => ({...c, amount: parseFloat(c.amount)})).filter(c => c.amount > 0 && c.user);
        const totalContribution = finalContributors.reduce((sum, c) => sum + c.amount, 0);

        if (Math.abs(totalContribution - parseFloat(amount)) > 0.01) {
            alert(`Total contributions ($${totalContribution.toFixed(2)}) must equal the expense amount ($${amount}).`);
            return;
        }

        const payload = {
            description,
            amount: parseFloat(amount),
            groupId: group._id,
            splitType,
            contributors: finalContributors,
            participants,
        };

        if (splitType === 'equal') {
            payload.splits = [];
        } else {
            const splitValues = Object.entries(splits)
                .filter(([, value]) => parseFloat(value) > 0)
                .map(([userId, value]) => ({ user: userId, amount: parseFloat(value) }));
            
            const totalSplit = splitValues.reduce((sum, s) => sum + s.amount, 0);

            if (splitType === 'custom' && Math.abs(totalSplit - payload.amount) > 0.01) {
                alert(`Custom splits must add up to the total amount of $${payload.amount}. Current total: $${totalSplit.toFixed(2)}`);
                return;
            }
            if (splitType === 'percentage') {
                if (Math.abs(totalSplit - 100) > 0.01) {
                    alert(`Percentages must add up to 100%. Current total: ${totalSplit}%`);
                    return;
                }
                payload.splits = splitValues.map(s => ({ ...s, amount: (payload.amount * s.amount) / 100 }));
            } else {
                payload.splits = splitValues;
            }
        }
        
        setIsLoading(true);
        try {
            await api.addExpense(payload);
            showNotification('Expense added successfully!');
            onBack();
        } catch (error) {
            alert(`Failed to add expense: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

     return (
        <div className="screen-container">
            <header className="screen-header"><button onClick={onBack} className="screen-header-button">Cancel</button><h1 className="screen-header-title">Add an Expense</h1><button onClick={handleSubmit} className="screen-header-button" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</button></header>
            <main className="screen-main">
             <form className="form-container" style={{maxWidth: 'none', textAlign: 'left'}} onSubmit={handleSubmit}>
                <label className="form-label">Description</label>
                <input className="input" type="text" placeholder="e.g., Groceries" style={{textAlign: 'left'}} value={description} onChange={e => setDescription(e.target.value)} />
                 <label className="form-label">Amount</label>
                <input className="input" type="number" placeholder="$0.00" style={{textAlign: 'left'}} value={amount} onChange={handleAmountChange} readOnly={contributors.length > 1} />
                
                <div className="split-container" style={{borderTop: 'none', paddingTop: 0}}>
                    <h3 className="groups-header">Paid By</h3>
                    {contributors.map((c, index) => (
                        <div key={index} className="contributor-item">
                            <select className="input select" style={{textAlign: 'left'}} value={c.user} onChange={e => handleContributorChange(index, 'user', e.target.value)}>
                                <option value="">Select Member</option>
                                {group.members.map(m => <option key={m._id} value={m._id}>{m._id === user._id ? 'You' : m.username}</option>)}
                            </select>
                            <input type="number" className="input" placeholder="$0.00" style={{textAlign: 'left'}} value={c.amount} onChange={e => handleContributorChange(index, 'amount', e.target.value)} />
                        </div>
                    ))}
                    <button type="button" className="link-button" onClick={addContributor}>+ Add another payer</button>
                </div>

                <label className="form-label" style={{marginTop: '1.5rem'}}>Split</label>
                 <select className="input select" style={{textAlign: 'left'}} value={splitType} onChange={e => setSplitType(e.target.value)}>
                    <option value="equal">Equally</option>
                    <option value="percentage">By Percentage</option>
                    <option value="custom">By Custom Amount</option>
                </select>

                <div className="split-container">
                    <h3 className="groups-header">Participants</h3>
                    {group.members.map(member => (
                        <div key={member._id} className="split-item" style={{justifyContent: 'space-between'}}>
                             <label>{member._id === user._id ? 'You' : member.username}</label>
                             <input type="checkbox" checked={participants.includes(member._id)} onChange={() => {
                                 setParticipants(prev => prev.includes(member._id) ? prev.filter(id => id !== member._id) : [...prev, member._id])
                             }} />
                        </div>
                    ))}
                </div>

                {(splitType === 'percentage' || splitType === 'custom') && (
                    <div className="split-container">
                        <h3 className="groups-header">Split Details</h3>
                        {group.members.filter(m => participants.includes(m._id)).map(member => (
                            <div key={member._id} className="split-item">
                                <label className="split-label">{member._id === user._id ? 'You' : member.username}</label>
                                <input 
                                    type="number" 
                                    className="split-input"
                                    placeholder={splitType === 'percentage' ? '%' : '$'}
                                    value={splits[member._id] || ''}
                                    onChange={(e) => handleSplitChange(member._id, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                )}
                 <label className="form-label" style={{marginTop: '1rem'}}>Attach Bill (Optional)</label>
                <label className="file-upload-box"><UploadIcon /><p>Click to upload</p><input type="file" onChange={handleFileChange}/></label>
                {receiptFile && <p className="file-upload-success-text">Attached: {receiptFile.name}</p>}
            </form>
            </main>
        </div>
    )
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

export default App;
