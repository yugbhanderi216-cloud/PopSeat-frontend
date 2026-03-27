import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TheaterDashboard.css';

const TheaterDashboard = () => {
    // 1. Role-Based Access & Authentication
    const navigate = useNavigate();
    const location = useLocation();
    
    // Auth States
    const [role, setRole] = useState(null);
    const [isWorker, setIsWorker] = useState(false);
    const [token, setToken] = useState(null);
    const [email, setEmail] = useState(null);
    const [theaterId, setTheaterId] = useState(null);

    // Data States
    const [theater, setTheater] = useState(null);
    const [orders, setOrders] = useState({ total: 0, revenue: 0, counts: {} });
    const [activeTab, setActiveTab] = useState('overview');
    
    // UI states
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Read auth from localStorage based on possible keys
        const storedRole = localStorage.getItem('role') || localStorage.getItem('ownerRole') || localStorage.getItem('workerRole');
        const storedToken = localStorage.getItem('token') || localStorage.getItem('ownerToken') || localStorage.getItem('workerToken');
        const storedEmail = localStorage.getItem('email') || localStorage.getItem('ownerEmail') || localStorage.getItem('workerEmail');
        
        let storedTheaterId = new URLSearchParams(location.search).get('theaterId');
        if (!storedTheaterId && storedRole === 'worker') {
            storedTheaterId = localStorage.getItem('assignedTheaterId');
        }

        if (!storedToken || !storedRole) {
            navigate('/login');
            return;
        }

        setRole(storedRole);
        const workerCheck = storedRole === 'worker';
        setIsWorker(workerCheck);
        setToken(storedToken);
        setEmail(storedEmail);
        setTheaterId(storedTheaterId);
        
    }, [navigate, location.search]);

    // Data Fetching
    const fetchTheater = useCallback(async () => {
        if (!theaterId) return;
        try {
            const res = await fetch(`/api/cinema/${theaterId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTheater(data);
            }
        } catch (error) {
            console.error("Failed to fetch theater:", error);
        }
    }, [theaterId, token]);

    const fetchOrders = useCallback(async () => {
        if (!theaterId) return;
        try {
            if (isWorker) {
                 // Worker: parallel requests for each status
                 const statuses = ['placed', 'preparing', 'ready', 'delivered'];
                 const reqs = statuses.map(st => 
                     fetch(`/api/worker/orders?status=${st}`, { headers: { 'Authorization': `Bearer ${token}` } })
                 );
                 const responses = await Promise.all(reqs);
                 let total = 0;
                 let revenue = 0;
                 let counts = {};
                 
                 for (let i = 0; i < responses.length; i++) {
                     if (responses[i].ok) {
                         const data = await responses[i].json();
                         const count = data.length || data.count || 0;
                         counts[statuses[i]] = count;
                         total += count;
                         if (statuses[i] === 'delivered' && Array.isArray(data)) {
                             revenue += data.reduce((acc, curr) => acc + (curr.total || 0), 0);
                         }
                     }
                 }
                 setOrders({ total, revenue, counts });
                 
            } else {
                 // Owner request
                 const res = await fetch(`/api/orders?cinemaId=${theaterId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                 });
                 if (res.ok) {
                     const data = await res.json();
                     const counts = {};
                     let total = data.length || 0;
                     let revenue = 0;
                     
                     if (Array.isArray(data)) {
                         data.forEach(order => {
                             counts[order.status] = (counts[order.status] || 0) + 1;
                             if (order.status === 'delivered') revenue += (order.total || 0);
                         });
                     }
                     setOrders({ total, revenue, counts });
                 }
            }
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        }
    }, [theaterId, token, isWorker]);

    useEffect(() => {
        if (theaterId && token) {
            setLoading(false);
            fetchTheater();
            fetchOrders();
            
            // Auto-refresh orders every 5 seconds
            const interval = setInterval(fetchOrders, 5000);
            return () => clearInterval(interval);
        }
    }, [theaterId, token, fetchTheater, fetchOrders]);

    const handleLogout = () => {
        // Clear relevant localStorage keys
        const keysToRemove = [
            'token', 'ownerToken', 'workerToken',
            'role', 'ownerRole', 'workerRole',
            'email', 'ownerEmail', 'workerEmail',
            'assignedTheaterId'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        navigate('/login');
    };

    const navItems = [
        { id: 'overview', label: 'Overview Dashboard', icon: '📊' },
        { id: 'orders', label: 'Orders Management', icon: '🧾' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'menu', label: 'Food Menu Management', icon: '🍔' },
        { id: 'qr', label: 'QR Code Generator', icon: '🔲' },
    ];

    if (!isWorker) {
        navItems.push({ id: 'settings', label: 'Settings', icon: '⚙️' });
    }

    if (loading) return <div className="dashboard-loading">Loading Dashboard...</div>;

    return (
        <div className="theater-dashboard-layout">
            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <h2>PopSeat Admin</h2>
                    <span className="role-badge">{role || 'User'}</span>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="main-header">
                    <div className="theater-info">
                        <h1>{theater?.name || 'Theater Name'}</h1>
                        <p>{theater?.city || 'City'} • {theater?.address || 'Address'}</p>
                    </div>
                    <div className="user-profile">
                        <span className="user-email">{email || 'User Email'}</span>
                        <div className="avatar">👤</div>
                    </div>
                </header>

                <div className="content-area">
                    {activeTab === 'overview' && (
                        <div className="overview-tab fade-in">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>Total Orders</h3>
                                    <p className="stat-value">{orders.total || 0}</p>
                                </div>
                                <div className="stat-card highlight">
                                    <h3>Revenue</h3>
                                    <p className="stat-value">${(orders.revenue || 0).toFixed(2)}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Pending</h3>
                                    <p className="stat-value">{orders.counts['placed'] || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Preparing</h3>
                                    <p className="stat-value">{orders.counts['preparing'] || 0}</p>
                                </div>
                            </div>
                            
                            <div className="info-grid">
                                <div className="info-card">
                                    <h3>Theater Details</h3>
                                    <ul>
                                        <li><strong>Contact:</strong> {theater?.contact || 'N/A'}</li>
                                        <li><strong>Screens:</strong> {theater?.screens || 'N/A'}</li>
                                        <li><strong>Opening:</strong> {theater?.opening_time || 'N/A'}</li>
                                        <li><strong>Closing:</strong> {theater?.closing_time || 'N/A'}</li>
                                    </ul>
                                </div>
                                <div className="info-card">
                                    <h3>Recent Activity</h3>
                                    <div className="empty-state-box">
                                        <span className="empty-icon">📭</span>
                                        <p>No recent activity to show.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab !== 'overview' && (
                        <div className="tab-placeholder fade-in">
                            <span className="placeholder-icon">{navItems.find(i => i.id === activeTab)?.icon}</span>
                            <h2>{navItems.find(i => i.id === activeTab)?.label}</h2>
                            <p>This module is currently under construction.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TheaterDashboard;
