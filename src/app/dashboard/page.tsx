'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Room {
  id: string;
  name: string;
  group_id: string;
}

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const { user, loading, error } = useAuth();
  const router = useRouter();

  console.log('Dashboard - Auth state:', { user, loading, error });

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { user, loading, error });
    
    if (error) {
      console.error('Auth error in dashboard:', error);
      toast.error('Authentication error');
    }

    if (!user && !loading) {
      console.log('No user found, redirecting to login');
      router.push('/login');
      return;
    }

    if (user && !user.email_confirmed_at) {
      console.log('Email not confirmed, redirecting to verify-email');
      router.push('/verify-email');
      return;
    }

    if (user) {
      console.log('User authenticated, fetching rooms for user:', user.id);
      fetchUserRooms();
    }
  }, [user, loading, error]);

  const fetchUserRooms = async () => {
    if (!user) return;

    try {
      console.log('Fetching room members for user:', user.id);
      const { data: memberData, error: memberError } = await supabase
        .from('room_members')
        .select('room_id, role')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching room members:', memberError);
        throw memberError;
      }

      console.log('Room members data:', memberData);

      const roomIds = memberData?.map((member) => member.room_id) || [];
      console.log('Room IDs found:', roomIds);
      
      if (roomIds.length === 0) {
        console.log('No rooms found for user');
        setRooms([]);
        return;
      }

      console.log('Fetching room details for IDs:', roomIds);
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name, group_id')
        .in('id', roomIds);

      if (roomError) {
        console.error('Error fetching rooms:', roomError);
        throw roomError;
      }

      console.log('Rooms data:', roomData);
      setRooms(roomData || []);

      // Set active room to first room if none selected
      if (roomData && roomData.length > 0 && !activeRoom) {
        console.log('Setting active room to first room:', roomData[0]);
        setActiveRoom(roomData[0]);
        const memberRole = memberData.find((member) => member.room_id === roomData[0].id)?.role;
        setUserRole(memberRole || 'member');
        console.log('User role for room:', memberRole);
      } else {
        console.log('No rooms available to set as active');
      }
    } catch (error) {
      console.error('Error fetching user rooms:', error);
      toast.error('Failed to load rooms');
    }
  };

  const handleRoomSelect = async (room: Room) => {
    console.log('Room selected:', room);
    setActiveRoom(room);
    
    if (user) {
      const { data: memberData } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      setUserRole(memberData?.role || 'member');
      console.log('User role for room:', memberData?.role);
    }
  };

  if (loading) {
    console.log('Dashboard: Loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    console.log('Dashboard: Error state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-destructive">Authentication error: {error}</div>
      </div>
    );
  }

  console.log('Dashboard: Rendering main layout');
  return (
    <div className="h-screen flex">
      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onRoomSelect={handleRoomSelect}
        onRoomsUpdate={fetchUserRooms}
      />
      
      <div className="flex-1 flex flex-col">
        <Header activeRoom={activeRoom} userRole={userRole} />
        <ChatInterface activeRoom={activeRoom} userRole={userRole} />
      </div>
    </div>
  );
}