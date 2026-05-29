import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ReferralHandler = () => {
  const { refId } = useParams<{ refId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (refId) {
      // Store the referrer code in localStorage
      localStorage.setItem("gln_referrer_id", refId);
      
      // Clean up refId to display format (capitalize first letter of words)
      const cleanName = refId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      toast.success(`Code de parrainage de ${cleanName} activé !`);
    }

    // Redirect to the home page after a brief moment
    const timer = setTimeout(() => {
      navigate("/");
    }, 1200);

    return () => clearTimeout(timer);
  }, [refId, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4 max-w-sm px-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <h2 className="font-heading text-xl font-bold">Activation du parrainage...</h2>
        <p className="text-sm text-muted-foreground">
          Vous êtes redirigé vers la page d'accueil de GLN DIGITAL.
        </p>
      </div>
    </div>
  );
};

export default ReferralHandler;
