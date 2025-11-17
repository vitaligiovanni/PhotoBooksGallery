import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProfilePage } from "./ProfilePage";

export default function Profile() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <ProfilePage />
        <Footer />
      </div>
    </ProtectedRoute>
  );
}