'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Trophy, Settings, LogOut, Plus, MoreVertical, ClipboardList, UserCheck, 
  LayoutDashboard, Search, Filter, Check, ChevronDown, X, Activity, Clock, AlertCircle, 
  CheckCircle2, Edit2, Share2, Globe, BarChart3, ShieldOff, Copy, ShieldCheck, Phone, Mail, Calendar
} from 'lucide-react';
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Supabase Logic
import { 
  getClubs, 
  getAllEvents, 
  getPlatformStats, 
  createClub, 
  toggleAdminStatus, 
  resetAdminPassword, 
  deleteClub,
  updateClub,
  getPlatformSettings,
  updatePlatformSettings,
  updateAdminProfile,
  getLiveHealthData
} from '@/lib/actions/super-admin';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { purgeAllJudges } from '@/lib/actions/judges';
import { gooeyToast as toast } from 'goey-toast';

export default function EventRankDashboard() {
  const [activeNav, setActiveNav] = useState('organizers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  
  // Custom Data States
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Custom Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', email: '' });
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '', slug: '', location: '' });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [platformSettings, setPlatformSettings] = useState({ maintenance_mode: false, announcement_text: '', announcement_active: false, brand_color: '#6c63ff', needsSetup: false });
  const [adminProfileData, setAdminProfileData] = useState({ name: 'Platform Owner', email: 'superadmin@eventrank', password: '' });

  const [healthConnected, setHealthConnected] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(0);

  useEffect(() => {
    let interval;
    if (healthConnected) {
      interval = setInterval(async () => {
        const result = await getLiveHealthData();
        if (!result.error) {
          setHealthData(result.data);
          setLastRefreshed(0);
        }
      }, 120000); // 120s auto-refresh
    }
    return () => clearInterval(interval);
  }, [healthConnected]);

  useEffect(() => {
    let timer;
    if (healthConnected) {
      timer = setInterval(() => {
        setLastRefreshed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [healthConnected]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [activeNav]);

  useEffect(() => {
    async function syncSettings() {
      const settingsReq = await getPlatformSettings();
      if (settingsReq?.data) {
        setPlatformSettings({ ...settingsReq.data, needsSetup: settingsReq.needsSetup || false });
      }
    }
    syncSettings();
  }, []); // Only once on mount

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    if (activeNav === 'organizers') {
      const result = await getClubs();
      if (result?.data) setClubs(result.data);
    } else if (activeNav === 'events') {
      const result = await getAllEvents();
      if (result?.data) setEvents(result.data);
    } else if (activeNav === 'stats') {
      const result = await getPlatformStats();
      if (result?.data) setStats(result.data);
    }
    if (!silent) setLoading(false);
  }

  // Action Handlers
  async function handleCreateClub(e) {
    e.preventDefault();
    const form = new FormData();
    form.append('name', formData.name);
    form.append('slug', formData.slug);
    form.append('email', formData.email);
    
    toast.promise(
      new Promise(async (resolve, reject) => {
        const result = await createClub(form);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
          if (result.credentials) setCreatedCredentials(result.credentials);
          else setTimeout(() => toast.info('Existing user added to club.', { duration: 4000 }), 1000);
          setShowCreateModal(false);
          setFormData({ name: '', slug: '', email: '' });
          loadData(true);
        }
      }),
      {
        loading: 'Setting up new organizer...',
        success: 'Deployment complete!',
        error: (err) => err.message
      }
    );
  }

  async function handleUpdateClub(e) {
    e.preventDefault();
    const form = new FormData();
    form.append('name', editData.name);
    form.append('slug', editData.slug);
    if (editData.location) form.append('location', editData.location);
    
    toast.promise(
      new Promise(async (resolve, reject) => {
        const result = await updateClub(editData.id, form);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
          setShowEditModal(false);
          loadData(true);
        }
      }),
      { loading: 'Saving changes...', success: 'Organizer updated successfully!', error: (err) => err.message }
    );
  }

  async function handleConnectHealth() {
    if (healthConnected) {
      setHealthConnected(false);
      setHealthData(null);
      toast.success('Health agent disconnected. Database reads paused.');
      return;
    }

    toast.promise(
      new Promise(async (resolve, reject) => {
        const result = await getLiveHealthData();
        if (result.error) reject(new Error(result.error));
        else {
          setHealthData(result.data);
          setHealthConnected(true);
          setLastRefreshed(0);
          resolve(result);
        }
      }),
      {
        loading: 'Connecting to live database stream...',
        success: 'Health agent connected!',
        error: (err) => err.message
      }
    );
  }

  async function handleUpdateGlobalSettings(e) {
    e.preventDefault();
    if (platformSettings.needsSetup) return toast.error('Database setup required first.');
    
    toast.promise(
      new Promise(async (resolve, reject) => {
        const result = await updatePlatformSettings({
          maintenance_mode: platformSettings.maintenance_mode,
          announcement_text: platformSettings.announcement_text,
          announcement_active: platformSettings.announcement_active,
          brand_color: platformSettings.brand_color
        });
        
        if (result.error === 'needsSetup') return reject(new Error('Missing database table. Contact system administrator.'));
        if (result.error) return reject(new Error(result.error));
        
        const profileForm = new FormData();
        if (adminProfileData.name) profileForm.append('name', adminProfileData.name);
        if (adminProfileData.email) profileForm.append('email', adminProfileData.email);
        if (adminProfileData.password) profileForm.append('password', adminProfileData.password);
        
        const profileResult = await updateAdminProfile(profileForm);
        if (profileResult.error) return reject(new Error(profileResult.error));
        
        resolve(result);
        setShowSettingsModal(false);
      }),
      {
        loading: 'Saving global settings...',
        success: 'Settings pushed to all servers globally!',
        error: (err) => err.message
      }
    );
  }

  function handleToggleStatus(userId, currentRole) {
    const isRevoking = currentRole === 'club_admin';
    toast.promise(
      new Promise(async (resolve, reject) => {
        const result = await toggleAdminStatus(userId, currentRole);
        if (result.error) reject(new Error(result.error));
        else {
          resolve(result);
          loadData(true);
        }
      }),
      {
        loading: isRevoking ? 'Revoking access...' : 'Restoring access...',
        success: isRevoking ? 'Access revoked successfully' : 'Access restored successfully',
        error: (err) => err.message
      }
    );
  }

  function handleResetPassword(userId, email) {
    toast.info('Security Action', {
      description: `Generate a new password for ${email}?`,
      action: {
        label: 'Yes, Reset',
        onClick: () => {
          toast.promise(
            new Promise(async (resolve, reject) => {
              const result = await resetAdminPassword(userId, email);
              if (result.error) reject(new Error(result.error));
              else {
                resolve(result);
                // Opening the modal with the new credentials
                setCreatedCredentials(result.credentials);
                loadData(true);
              }
            }),
            {
              loading: 'Generating new password...',
              success: 'Password reset successful!',
              error: (err) => err.message
            }
          );
        }
      },
      duration: 10000
    });
  }

  async function confirmDeleteClub(clubId) {
    const tid = toast('Deleting...')
    const { error } = await deleteClub(clubId);
    toast.dismiss(tid)
    if (error) toast.error(error);
    else { toast.warning("Deleted.", { description: "Organizer permanently wiped." }); loadData(true); }
  }

  function handleDeleteClub(clubId, clubName) {
    toast.error('Delete Organizer', {
      description: `Permanently delete ${clubName}? This wipes all events forever.`,
      action: {
        label: 'Yes, Delete',
        onClick: () => confirmDeleteClub(clubId)
      },
      timing: { displayDuration: 10000 }
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handlePurgeJudges(eventId, eventName) {
    toast.error(`Purge ${eventName}?`, {
      description: 'This will DELETE ALL judge accounts and scores for this event forever.',
      action: {
        label: 'YES, PURGE',
        onClick: async () => {
          const tid = toast('Purging records...');
          const result = await purgeAllJudges(eventId);
          toast.dismiss(tid);
          if (result.error) toast.error(result.error);
          else {
            toast.success('Event records cleaned.');
            loadData(true);
          }
        }
      },
      duration: 8000
    });
  }

  const [filters, setFilters] = useState({
    status: [],
    category: [],
    location: [],
  });

  const navItems = [
    { name: 'Organizers', icon: Building2, id: 'organizers' },
    { name: 'All Events', icon: Globe, id: 'events' },
    { name: 'Platform Stats', icon: BarChart3, id: 'stats' },
  ];

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const lowerQuery = searchQuery.toLowerCase();
      return club.name.toLowerCase().includes(lowerQuery) || club.slug.toLowerCase().includes(lowerQuery);
    });
  }, [searchQuery, clubs]);

  const formatLastSeen = (date) => {
    if (!date) return 'Haven\'t logged in yet';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  const getStatusBadge = (status) => {
    const variants = {
      live: 'bg-green-500/10 text-green-600 border-green-500/30',
      draft: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      completed: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
    };
    const icons = {
      live: <Activity className="w-3 h-3" />,
      draft: <Clock className="w-3 h-3" />,
      completed: <CheckCircle2 className="w-3 h-3" />,
    };
    const labels = {
      live: 'Active',
      draft: 'Pending',
      completed: 'Offline',
    };
    return (
      <Badge variant="outline" className={`${variants[status]} flex w-fit items-center gap-1 font-medium`}>
        {icons[status]}
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Retained exactly as the AI Code */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">EventRank</h1>
              <p className="text-xs text-slate-500">Super Admin Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeNav === item.id
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 transition-colors">
            <Avatar className="w-9 h-9 border-2 border-slate-200">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
              <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold">SA</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">Platform Owner</p>
              <p className="text-xs text-slate-500 truncate">superadmin@eventrank</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 capitalize">Platform {activeNav}</h2>
              <p className="text-sm text-slate-500 mt-1">Manage platform-wide settings and organizers</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="border-slate-200 hover:bg-slate-100" onClick={() => setShowSettingsModal(true)}>
                <Settings className="w-4 h-4 text-slate-600" />
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? <div className="w-4 h-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8">
              {loading && activeNav === 'stats' && (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-[120px]">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-24 h-4 bg-slate-200 rounded"></div>
                        <div className="w-8 h-8 bg-slate-100 rounded"></div>
                      </div>
                      <div className="w-16 h-8 bg-slate-200 rounded mb-2"></div>
                      <div className="w-32 h-3 bg-slate-100 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
              {loading && activeNav === 'events' && (
                <div className="animate-pulse">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="w-48 h-8 bg-slate-200 rounded mb-2"></div>
                      <div className="w-64 h-4 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="border-b border-slate-100 p-4 bg-slate-50"><div className="w-full h-10 bg-slate-200 rounded"></div></div>
                    <div className="p-4 space-y-4">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-slate-100 rounded w-full"></div>)}
                    </div>
                  </div>
                </div>
              )}
              {loading && activeNav === 'organizers' && (
                <div className="animate-pulse">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="w-48 h-8 bg-slate-200 rounded mb-2"></div>
                      <div className="w-64 h-4 bg-slate-100 rounded"></div>
                    </div>
                    <div className="w-40 h-10 bg-slate-200 rounded-lg"></div>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                            <div>
                              <div className="w-32 h-5 bg-slate-200 rounded mb-2"></div>
                              <div className="w-48 h-3 bg-slate-100 rounded"></div>
                            </div>
                          </div>
                          <div className="w-24 h-8 bg-slate-100 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && activeNav === 'organizers' && (
                <motion.div initial={{opacity: 0}} animate={{opacity:1}} className="mb-8">
                  {/* Hero Section */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-2xl shadow-slate-900/20 border border-slate-700 mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold mb-2">Platform Organizers</h1>
                        <p className="text-slate-300 text-lg">Manage your registered clubs and organizers</p>
                      </div>
                      <div className="hidden md:flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold">{clubs.length}</div>
                          <div className="text-slate-400 text-sm">Total Organizers</div>
                        </div>
                        <div className="w-px h-12 bg-slate-700"></div>
                        <div className="text-center">
                          <div className="text-3xl font-bold">{clubs.reduce((acc, c) => acc + c.eventCount, 0)}</div>
                          <div className="text-slate-400 text-sm">Active Events</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Registered Organizers</h2>
                      <p className="text-slate-500 mt-1">{filteredClubs.length} of {clubs.length} organizers</p>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 font-semibold">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Organizer
                    </Button>
                  </div>

                  <div className="flex gap-3 mb-8">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search organizers by name or slug..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-white border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Events/Clubs Table (Using AI's beautifully designed table exactly) */}
                  <Card className="border-slate-200 bg-white shadow-lg overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-12"></TableHead>
                            <TableHead className="font-semibold">Organizer Name</TableHead>
                            <TableHead className="font-semibold">URL Slug</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold text-right">Hosted Events</TableHead>
                            <TableHead className="font-semibold text-right">Total Participants</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence mode="popLayout">
                            {filteredClubs.length > 0 ? (
                              filteredClubs.map((club, index) => (
                                <React.Fragment key={club.id}>
                                  <motion.tr
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedEvent(expandedEvent === club.id ? null : club.id)}
                                  >
                                    <TableCell>
                                      <motion.div animate={{ rotate: expandedEvent === club.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                      </motion.div>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-900">{club.name}</TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">/{club.slug}</Badge>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(club.eventCount > 0 ? 'live' : 'draft')}</TableCell>
                                    <TableCell className="text-right">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setExpandedEvent(expandedEvent === club.id ? null : club.id); }}
                                        className="inline-flex items-center gap-2 hover:bg-slate-100 px-3 py-1 rounded-full transition-colors group"
                                      >
                                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{club.eventCount}</span>
                                        <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-all ${expandedEvent === club.id ? 'rotate-180' : ''}`} />
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2" title="Total Participants">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="font-semibold text-slate-900">{club.participantCount}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 outline-none transition-colors" onClick={(e) => e.stopPropagation()}>
                                          <MoreVertical className="w-4 h-4 text-slate-600" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" onClick={() => handleDeleteClub(club.id, club.name)}>
                                            <ShieldOff className="w-4 h-4 mr-2" /> Delete Organizer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </motion.tr>

                                  {/* AI's Expanded Details Row applied to Admins */}
                                  <AnimatePresence>
                                    {expandedEvent === club.id && (
                                      <motion.tr key={`${club.id}-details`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <TableCell colSpan={7} className="bg-slate-50 p-0">
                                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className="p-6 space-y-4">
                                              
                                              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                                <div>
                                                  <h3 className="text-lg font-bold text-slate-900">{club.name} Admins</h3>
                                                  <p className="text-sm text-slate-500 mt-1 mb-3">Manage platform access for this organization.</p>
                                                  <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-slate-100/80 text-slate-600 hover:bg-slate-200/50 transition-colors">
                                                      <Clock className="w-3 h-3 mr-1.5" />
                                                      Created {new Date(club.created_at).toLocaleDateString()}
                                                    </Badge>
                                                    {club.location && (
                                                      <Badge variant="secondary" className="bg-indigo-50/80 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50 transition-colors">
                                                        Location: {club.location}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50" onClick={() => { setEditData({ id: club.id, name: club.name, slug: club.slug, location: club.location || '' }); setShowEditModal(true); }}>
                                                    <Edit2 className="w-4 h-4 mr-2" /> Edit Info
                                                  </Button>
                                                  <Badge variant="outline" className="bg-white px-3 py-1 text-slate-600 font-medium border-slate-200">
                                                     <UserCheck className="w-4 h-4 mr-2" /> {club.judgeCount} Total Judges
                                                  </Badge>
                                                </div>
                                              </div>

                                              {/* Admin List replacing the AI's "Event Stats Grid" */}
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {club.admins.length > 0 ? club.admins.map(a => (
                                                  <div key={a.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                                                    <div>
                                                      <div className="flex items-center justify-between mb-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-tight ${a.role === 'club_admin' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                          {a.role === 'club_admin' ? 'ACTIVE' : 'SUSPENDED'}
                                                        </span>
                                                        {a.last_active_at && (
                                                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatLastSeen(a.last_active_at)}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="font-bold text-slate-900 mb-2 truncate" title={a.email}>{a.email}</div>
                                                      
                                                      <div className="space-y-1 mb-4">
                                                        {a.phone && (
                                                          <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Phone className="w-3 h-3 text-slate-400" /> {a.phone}
                                                          </div>
                                                        )}
                                                        {a.alt_email && (
                                                          <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Mail className="w-3 h-3 text-slate-400" /> {a.alt_email}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                      <Button variant="outline" size="sm" className="flex-1 text-xs px-2 font-bold h-9" onClick={() => handleToggleStatus(a.id, a.role)}>
                                                        {a.role === 'club_admin' ? 'Revoke Access' : 'Restore Access'}
                                                      </Button>
                                                      <Button variant="outline" size="sm" className="flex-1 text-xs px-2 hover:bg-amber-50 font-bold h-9" onClick={() => handleResetPassword(a.id, a.email)}>
                                                        Reset PW
                                                      </Button>
                                                    </div>
                                                  </div>
                                                )) : (
                                                  <div className="col-span-full border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-500">
                                                    No administrators assigned yet.
                                                  </div>
                                                )}
                                              </div>

                                              {/* Hosted Events Expansion Section */}
                                              {club.events.length > 0 && (
                                                <div className="mt-8 pt-6 border-t border-slate-200">
                                                  <div className="flex items-center gap-2 mb-4">
                                                    <Trophy className="w-4 h-4 text-indigo-500" />
                                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Hosted Events List ({club.events.length})</h4>
                                                  </div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {club.events.map(ev => (
                                                      <div key={ev.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                          <div className={`w-2 h-2 rounded-full ${ev.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                                          <div>
                                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{ev.name}</p>
                                                            <p className="text-[10px] text-slate-500">Status: {ev.is_active ? 'Active' : 'Completed'}</p>
                                                          </div>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-slate-400">{new Date(ev.created_at).toLocaleDateString()}</p>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        </TableCell>
                                      </motion.tr>
                                    )}
                                  </AnimatePresence>
                                </React.Fragment>
                              ))
                            ) : (
                              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <TableCell colSpan={7} className="h-48 text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                                    <p className="text-slate-500">No organizers matching search.</p>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {!loading && activeNav === 'stats' && stats && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                  <h2 className="text-2xl font-bold text-slate-900 col-span-full mb-2">System Analytics Overview</h2>
                  
                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-slate-500">Total Organizers</CardDescription>
                      <CardTitle className="text-3xl font-bold text-slate-900">{stats.totalClubs}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-slate-500">Active platform tenants</p></CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-slate-500">Hosted Events</CardDescription>
                      <CardTitle className="text-3xl font-bold text-slate-900">{stats.totalEvents}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-slate-500">Successful deployments</p></CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-slate-500">Global Participants</CardDescription>
                      <CardTitle className="text-3xl font-bold text-slate-900">{stats.totalParticipants}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-slate-500">Across all active events</p></CardContent>
                  </Card>
                  
                  <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-slate-500">Global Judges</CardDescription>
                      <CardTitle className="text-3xl font-bold text-slate-900">{stats.totalJudges}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-slate-500">Evaluating scores</p></CardContent>
                  </Card>
                </motion.div>
              )}

              {/* LIVE HEALTH DIAGNOSTICS */}
              {!loading && activeNav === 'stats' && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-8 border-t border-slate-200 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        Live System Diagnostics
                        {healthConnected && (
                          <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Live
                          </Badge>
                        )}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {healthConnected ? `Auto-refreshing in ${120 - lastRefreshed}s • Last update: ${lastRefreshed}s ago` : 'Real-time database health and platform activity'}
                      </p>
                    </div>
                    <Button 
                      variant={healthConnected ? "outline" : "default"}
                      className={healthConnected ? "border-red-200 text-red-600 hover:bg-red-50" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"}
                      onClick={handleConnectHealth}
                    >
                      {healthConnected ? (
                        <><X className="w-4 h-4 mr-2" /> Disconnect Agent</>
                      ) : (
                        <><Activity className="w-4 h-4 mr-2" /> Connect Live Health</>
                      )}
                    </Button>
                  </div>

                  {healthConnected && healthData && (
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Health Monitors */}
                      <div className="lg:col-span-1 space-y-4">
                        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden group">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <p className="text-sm font-medium text-slate-500">Database Latency</p>
                                 {(() => {
                                   const ms = parseInt(healthData.latency);
                                   if (ms > 1000) return <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-600 border-red-100">Critical</Badge>;
                                   if (ms > 300) return <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-50 text-amber-600 border-amber-100">Stable</Badge>;
                                   return <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-600 border-emerald-100">Fast</Badge>;
                                 })()}
                               </div>
                               <div className="flex items-center gap-2">
                                 <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${parseInt(healthData.latency) > 1000 ? 'bg-red-500' : parseInt(healthData.latency) > 300 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                 <span className="text-2xl font-bold text-slate-900">{healthData.latency}</span>
                               </div>
                               <p className="text-[10px] text-slate-400 mt-1">Round-trip time for DB requests</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm bg-white">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <p className="text-sm font-medium text-slate-500">Auth API Status</p>
                                 <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-indigo-50 text-indigo-600 border-indigo-100">Healthy</Badge>
                               </div>
                               <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                 <span className="text-xl font-bold text-slate-900">{healthData.status}</span>
                               </div>
                               <p className="text-[10px] text-slate-400 mt-1">Session & Auth Engine health</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm bg-white">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <p className="text-sm font-medium text-slate-500">Online Judges</p>
                                 <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-indigo-50 text-indigo-600 border-indigo-100">Active</Badge>
                               </div>
                               <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                 <span className="text-xl font-bold text-slate-900">{healthData.onlineJudges} Accounts</span>
                               </div>
                               <p className="text-[10px] text-slate-400 mt-1">Recent judge registrations detected</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm bg-white">
                          <CardContent className="p-5">
                             <div className="flex justify-between items-end mb-2">
                               <div>
                                 <p className="text-sm font-medium text-slate-500">Database Storage</p>
                                 <p className="text-[10px] text-slate-400">{healthData.storageMB} MB / 500 MB limit</p>
                               </div>
                               <span className="text-lg font-bold text-slate-900">{Math.round(healthData.storageMB / 5).toFixed(1)}%</span>
                             </div>
                             <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${(healthData.storageMB / 5)}%` }}></div>
                             </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Activity Feed */}
                      <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" /> Recent Platform Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-slate-100">
                            {healthData.activity.map((act, i) => (
                              <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  act.type==='event'?'bg-indigo-100 text-indigo-600' : 
                                  act.type==='org'?'bg-emerald-100 text-emerald-600' : 
                                  act.type==='score'?'bg-amber-100 text-amber-600' : 
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {act.type === 'event' ? <Calendar className="w-4 h-4" /> : 
                                   act.type === 'org' ? <Users className="w-4 h-4" /> :
                                   act.type === 'score' ? <Trophy className="w-4 h-4" /> :
                                   <UserCheck className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-sm text-slate-900 font-medium">{act.text}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{new Date(act.time).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                            {healthData.activity.length === 0 && (
                              <div className="p-8 text-center text-slate-500 text-sm">No recent activity detected.</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                    </motion.div>
                  )}
                  
                  {!healthConnected && (
                    <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-8 text-center border-dashed">
                      <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-700 mb-1">Health Diagnostics Offline</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">Connect the live health agent to view real-time database latency, API statuses, and global platform activity. This uses active database reads.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* All Events Tab */}
              {!loading && activeNav === 'events' && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Global Events Directory</h2>
                  <Card className="border-slate-200 bg-white shadow-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="pl-6">Event Name</TableHead>
                          <TableHead>Organizer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Participants</TableHead>
                          <TableHead>Rounds</TableHead>
                          <TableHead>Judges</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.length > 0 ? events.map((ev, i) => (
                           <TableRow key={i} className="hover:bg-slate-50/50 transition-colors group">
                             <TableCell className="font-bold text-slate-900 pl-6 py-4">{ev.name}</TableCell>
                             <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-semibold uppercase text-[10px]">{ev.clubName || 'Unknown'}</Badge></TableCell>
                             <TableCell>{getStatusBadge(ev.is_active ? 'live' : 'completed')}</TableCell>
                             <TableCell className="font-medium text-slate-600 pl-6">{ev.participantCount || 0}</TableCell>
                             <TableCell className="font-medium text-slate-600 pl-4">{ev.roundCount || 0}</TableCell>
                               <TableCell className="max-w-[150px]">
                                 {ev.judgeDetails && ev.judgeDetails.length > 0 ? (
                                   <div className="flex items-center gap-2">
                                     <DropdownMenu>
                                       <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-2 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 px-2")}>
                                           <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">
                                             {ev.judgeDetails.length}
                                           </span>
                                           <span className="text-[11px] font-semibold">View Judges</span>
                                           <ChevronDown className="w-3 h-3 opacity-50" />
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="end" className="w-56 p-2">
                                         <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                                           Assigned Judges
                                         </div>
                                         {ev.judgeDetails.map((judge, idx) => (
                                           <DropdownMenuItem key={idx} className="flex flex-col items-start gap-0.5 py-2 cursor-default">
                                             <div className="text-xs font-bold text-slate-900">{judge.name}</div>
                                             <div className="text-[10px] text-slate-500 font-medium">{judge.email}</div>
                                           </DropdownMenuItem>
                                         ))}
                                       </DropdownMenuContent>
                                     </DropdownMenu>
                                     
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                                       title="Purge all judge data for this event"
                                       onClick={() => handlePurgeJudges(ev.id, ev.name)}
                                     >
                                       <ShieldOff className="w-4 h-4" />
                                     </Button>
                                   </div>
                                 ) : (
                                   <span className="text-[10px] text-slate-300 italic pl-3">No judges assigned</span>
                                 )}
                               </TableCell>
                               <TableCell>
                                 <div className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm transition-all hover:bg-white hover:border-indigo-200 group/date">
                                   <Calendar className="w-3 h-3 text-slate-400 group-hover/date:text-indigo-500 transition-colors" />
                                   <span className="text-[10px] font-black tracking-tight uppercase">
                                     {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                   </span>
                                 </div>
                               </TableCell>
                           </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-40 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-500">
                                <AlertCircle className="w-10 h-10 mb-3 text-slate-300" />
                                <p className="font-medium text-slate-600">No events found.</p>
                                <p className="text-sm text-slate-400 mt-1">No organizers have created any events on the platform yet.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </motion.div>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* Modals integrated precisely */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">Create New Organizer</h3>
                <p className="text-sm text-slate-500 mt-1">Set up a new organization.</p>
              </div>
              <form onSubmit={handleCreateClub} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Organizer Name</label>
                  <Input required placeholder="e.g. Computer Science Club" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">URL Slug</label>
                  <Input required placeholder="e.g. cs-club" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Primary Admin Email</label>
                  <Input required type="email" placeholder="admin@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="flex gap-3 justify-end pt-4 mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">Create Organizer</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">Edit Organizer</h3>
                <p className="text-sm text-slate-500 mt-1">Update details for {editData.name}.</p>
              </div>
              <form onSubmit={handleUpdateClub} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Organizer Name</label>
                  <Input required value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">URL Slug</label>
                  <Input required value={editData.slug} onChange={e => setEditData({...editData, slug: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Location (Optional)</label>
                  <Input placeholder="e.g. NIET B Block 204" value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} />
                </div>
                <div className="flex gap-3 justify-end pt-4 mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                  <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {createdCredentials && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center border-t-8 border-emerald-500">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm -mt-16">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black mb-2 text-slate-900">Success!</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Please share these login details with the new admin.</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 mb-8 text-left relative">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Login URL</label>
                  <div className="font-mono text-sm text-slate-900 break-all bg-white px-3 py-2 border border-slate-200 rounded-md">/login</div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email</label>
                  <div className="font-mono text-sm text-slate-900 break-all bg-white px-3 py-2 border border-slate-200 rounded-md">{createdCredentials.email}</div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Temp Password</label>
                  <div className="font-mono text-sm text-slate-900 break-all bg-white px-3 py-2 border border-slate-200 rounded-md shadow-sm border-indigo-100">{createdCredentials.password}</div>
                </div>
              </div>
              <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={() => setCreatedCredentials(null)}>Done</Button>
            </motion.div>
          </div>
        )}

        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-white h-full w-full max-w-md shadow-2xl flex flex-col border-l border-slate-200">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Global Settings</h3>
                  <p className="text-sm text-slate-500 mt-1">Configure platform-wide behavior</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(false)}><X className="w-5 h-5 text-slate-400" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {platformSettings.needsSetup && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm shadow-sm">
                    <strong className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Setup Required</strong>
                    <div className="mt-2 text-amber-700">You must create the global settings table in your Supabase SQL Editor before saving:</div>
                    <div className="relative mt-2">
                       <pre className="bg-white p-3 rounded-lg border border-amber-100 text-[10px] overflow-x-auto whitespace-pre-wrap select-all font-mono">
CREATE TABLE public.platform_settings ( id integer PRIMARY KEY, maintenance_mode boolean DEFAULT false, announcement_text text, announcement_active boolean DEFAULT false, brand_color text DEFAULT '#6c63ff' );
INSERT INTO public.platform_settings (id) VALUES (1);
                       </pre>
                    </div>
                  </div>
                )}

                <section>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Platform Controls</h4>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2"><ShieldOff className="w-4 h-4 text-red-500" /> Maintenance Mode</div>
                        <div className="text-xs text-slate-500 mt-0.5">Locks out all users globally.</div>
                      </div>
                      <input type="checkbox" className="w-5 h-5 accent-red-500" checked={platformSettings.maintenance_mode} onChange={e => setPlatformSettings({...platformSettings, maintenance_mode: e.target.checked})} />
                    </label>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="flex items-center justify-between mb-3 cursor-pointer">
                        <div>
                          <div className="font-bold text-slate-900">Global Announcement</div>
                          <div className="text-xs text-slate-500">Show banner on all dashboards</div>
                        </div>
                        <input type="checkbox" className="w-5 h-5 accent-slate-900" checked={platformSettings.announcement_active} onChange={e => setPlatformSettings({...platformSettings, announcement_active: e.target.checked})} />
                      </label>
                      {platformSettings.announcement_active && (
                        <textarea rows={2} className="w-full text-sm p-3 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white" placeholder="Type your global announcement here..." value={platformSettings.announcement_text || ''} onChange={e => setPlatformSettings({...platformSettings, announcement_text: e.target.value})} />
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Admin Security</h4>
                  <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Profile Name</label>
                      <Input value={adminProfileData.name} onChange={e => setAdminProfileData({...adminProfileData, name: e.target.value})} className="bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Admin Email</label>
                      <Input value={adminProfileData.email} onChange={e => setAdminProfileData({...adminProfileData, email: e.target.value})} className="bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">New Password (Optional)</label>
                      <Input type="password" placeholder="Leave blank to keep unchanged" value={adminProfileData.password} onChange={e => setAdminProfileData({...adminProfileData, password: e.target.value})} className="bg-white" />
                    </div>
                  </div>
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-white">
                <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-xl" onClick={handleUpdateGlobalSettings} disabled={platformSettings.needsSetup}>Save & Publish Globally</Button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
