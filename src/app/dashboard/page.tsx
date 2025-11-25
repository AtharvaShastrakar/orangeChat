'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  group_id: string;
}

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
      return;
    }

    if (user && !user.email_confirmed_at) {
      router.push('/verify-email');
      return;
    }

    fetchUserRooms();
  }, [user, loading]);

  const fetchUserRooms = async () => {
    if (!user) return;

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('room_members')
        .select('room_id, role')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const roomIds = memberData?.map((member) => member.room_id) || [];
      if (roomIds.length === 0) {
        setRooms([]);
        return;
      }

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name, group_id')
        .in('id', roomIds);

      if (roomError) throw roomError;

      setRooms(roomData || []);

      // Set active room to first room if none selected
      if (roomData.length > 0 && !activeRoom) {
        setActiveRoom(roomData[0]);
        const memberRole = memberData.find((member) => member.room_id === roomData[0].id)?.role;
        setUserRole(memberRole || 'member');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleRoomSelect = async (room: Room) => {
    setActiveRoom(room);
    
    if (user) {
      const { data: memberData } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      setUserRole(memberData?.role || 'member');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

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