'use client';

import { useState } from 'react';
import { Plus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Room {
  id: string;
  name: string;
  group_id: string;
}

interface SidebarProps {
  rooms: Room[];
  activeRoom: Room | null;
  onRoomSelect: (room: Room) => void;
  onRoomsUpdate: () => void;
}

export function Sidebar({ rooms, activeRoom, onRoomSelect, onRoomsUpdate }: SidebarProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !user) return;

    setLoading(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert([
          {
            name: roomName.trim(),
            group_id: crypto.randomUUID(),
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: memberError } = await supabase
        .from('room_members')
        .insert([
          {
            room_id: roomData.id,
            user_id: user.id,
            role: 'admin',
          },
        ]);

      if (memberError) throw memberError;

      toast.success('Room created successfully');
      setRoomName('');
      setShowCreateRoom(false);
      onRoomsUpdate();
    } catch (error) {
      toast.error('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId.trim() || !user) return;

    setLoading(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('group_id', groupId.trim())
        .single();

      if (roomError) throw roomError;

      const { error: memberError } = await supabase
        .from('room_members')
        .insert([
          {
            room_id: roomData.id,
            user_id: user.id,
            role: 'member',
          },
        ]);

      if (memberError) throw memberError;

      toast.success('Joined room successfully');
      setGroupId('');
      setShowJoinRoom(false);
      onRoomsUpdate();
    } catch (error) {
      toast.error('Invalid group ID or already a member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border h-full flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold">My Rooms</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {rooms.map((room) => (
          <button
            key={room.id}
            className={`w-full p-3 rounded-lg text-left mb-2 transition-colors ${
              activeRoom?.id === room.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/50'
            }`}
            onClick={() => onRoomSelect(room)}
          >
            <div className="font-medium">{room.name}</div>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowCreateRoom(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Room
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowJoinRoom(true)}
        >
          <LogIn className="w-4 h-4 mr-2" />
          Join Room
        </Button>
      </div>

      {showCreateRoom && (
        <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 z-10">
          <CardHeader>
            <CardTitle>Create Room</CardTitle>
            <CardDescription>Enter a name for your new room</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateRoom(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showJoinRoom && (
        <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 z-10">
          <CardHeader>
            <CardTitle>Join Room</CardTitle>
            <CardDescription>Enter the group ID to join a room</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupId">Group ID</Label>
                <Input
                  id="groupId"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="Enter group ID"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  Join
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJoinRoom(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}