import { Navigate, useParams } from "react-router-dom";
import { useEntity } from "@/contexts/EntityContext";

interface RedirectProps {
  to: string | ((params: Record<string, string>) => string);
}

const Redirect = ({ to }: RedirectProps) => {
  const params = useParams();
  const { currentEntity } = useEntity();
  
  // If to is a function, call it with the params
  const redirectPath = typeof to === 'function' ? to(params) : to;
  
  console.log("Redirecting to:", redirectPath, "from params:", params, "with entity:", currentEntity);
  
  // Handle the case where we're trying to redirect to a journal entry
  // but we don't have an entity context yet
  if (redirectPath.includes("/journal-entries/") && (!currentEntity || !currentEntity.id)) {
    console.log("No current entity for journal entry redirect, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to={redirectPath} replace />;
};

export default Redirect;