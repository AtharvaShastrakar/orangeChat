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

-- Enable Row Level Security on tables that don't have it enabled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND rowsecurity = true) THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rooms' AND rowsecurity = true) THEN
        ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'room_members' AND rowsecurity = true) THEN
        ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages' AND rowsecurity = true) THEN
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Public can view profiles" ON profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view rooms they are members of' AND tablename = 'rooms') THEN
        CREATE POLICY "Users can view rooms they are members of" ON rooms FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM room_members 
                WHERE room_members.room_id = rooms.id 
                AND room_members.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create rooms' AND tablename = 'rooms') THEN
        CREATE POLICY "Users can create rooms" ON rooms FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view room members for rooms they belong to' AND tablename = 'room_members') THEN
        CREATE POLICY "Users can view room members for rooms they belong to" ON room_members FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM room_members rm 
                WHERE rm.room_id = room_members.room_id 
                AND rm.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can join rooms' AND tablename = 'room_members') THEN
        CREATE POLICY "Users can join rooms" ON room_members FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view messages for rooms they belong to' AND tablename = 'messages') THEN
        CREATE POLICY "Users can view messages for rooms they belong to" ON messages FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM room_members 
                WHERE room_members.room_id = messages.room_id 
                AND room_members.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert messages if they are room members' AND tablename = 'messages') THEN
        CREATE POLICY "Users can insert messages if they are room members" ON messages FOR INSERT 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM room_members 
                WHERE room_members.room_id = messages.room_id 
                AND room_members.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own messages or if admin' AND tablename = 'messages') THEN
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
    END IF;
END $$;

-- Create function to handle new user creation if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', NOW(), NOW());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;