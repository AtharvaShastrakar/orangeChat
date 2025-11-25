-- Enable Row Level Security
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rooms table if it doesn't exist
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    group_id TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create room_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view room members for rooms they belong to" ON room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON room_members;
DROP POLICY IF EXISTS "Users can view messages for rooms they belong to" ON messages;
DROP POLICY IF EXISTS "Users can insert messages if they are room members" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or if admin" ON messages;

-- RLS Policies for profiles
CREATE POLICY "Public can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms they are members of" ON rooms FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM room_members 
        WHERE room_members.room_id = rooms.id 
        AND room_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create rooms" ON rooms FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for room_members
CREATE POLICY "Users can view room members for rooms they belong to" ON room_members FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM room_members rm 
        WHERE rm.room_id = room_members.room_id 
        AND rm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can join rooms" ON room_members FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for messages
CREATE POLICY "Users can view messages for rooms they belong to" ON messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM room_members 
        WHERE room_members.room_id = messages.room_id 
        AND room_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages if they are room members" ON messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM room_members 
        WHERE room_members.room_id = messages.room_id 
        AND room_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete own messages or if admin" ON messages FOR DELETE 
USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM room_members 
        WHERE room_members.room_id = messages.room_id 
        AND room_members.user_id = auth.uid() 
        AND room_members.role = 'admin'
    )
);

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', NOW(), NOW());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();