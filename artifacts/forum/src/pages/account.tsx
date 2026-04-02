import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMyProfile, useUploadAvatar, useGetMe, getGetMeQueryKey, useGetUserProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, Save, User as UserIcon } from "lucide-react";

export default function Account() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const { data: profileData } = useGetUserProfile(user?.username || "", { query: { enabled: !!user?.username } });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (profileData) {
      setDisplayName(profileData.displayName || "");
      setBio(profileData.bio || "");
    } else if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [profileData, user]);
  
  const updateProfileMutation = useUpdateMyProfile({
    mutation: {
      onSuccess: () => {
        toast({ title: "Configuration Updated", description: "Identity parameters saved securely." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        if (user?.username) {
          queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
        }
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update configuration." });
      }
    }
  });

  const uploadAvatarMutation = useUploadAvatar({
    mutation: {
      onSuccess: () => {
        toast({ title: "Avatar Transmitted", description: "Visual identity updated." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        if (user?.username) {
          queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}`] });
        }
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Transmission Failed", description: err.message || "Failed to upload avatar." });
      }
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ data: { displayName, bio } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64string = event.target?.result as string;
      uploadAvatarMutation.mutate({ data: { imageData: base64string } });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading || !user) return <Layout><div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-white/10 pb-6 mb-8">
          <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            Account Configuration
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-2">
            Manage your secure identity parameters.
          </p>
        </div>

        {/* Avatar Section */}
        <div className="bg-card/20 border border-white/5 p-6 rounded-lg flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/30 bg-background flex items-center justify-center shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-primary/50" />
            )}
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <h3 className="font-mono font-medium">Visual Identifier</h3>
              <p className="text-xs text-muted-foreground font-mono mt-1">Upload a square image. Max size 2MB.</p>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <Button 
              variant="outline" 
              className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadAvatarMutation.isPending ? "Transmitting..." : "Upload Photo"}
            </Button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-card/20 border border-white/5 p-6 rounded-lg space-y-6">
          <h3 className="font-mono font-medium border-b border-white/5 pb-4">Identity Details</h3>
          
          <div className="space-y-2">
            <Label className="font-mono text-muted-foreground">Alias (Display Name)</Label>
            <Input 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="e.g. Neo"
              className="bg-background/50 border-white/10 focus-visible:ring-primary font-mono max-w-md"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-muted-foreground">Directive (Bio)</Label>
            <Textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="Enter your system directive..."
              className="bg-background/50 border-white/10 focus-visible:ring-primary font-mono min-h-[120px]"
              maxLength={500}
            />
          </div>

          <Button 
            className="font-mono bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateProfileMutation.isPending ? "Saving..." : "Save Parameters"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
