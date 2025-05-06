import { Navigate } from "react-router-dom";

interface RedirectProps {
  to: string;
}

const Redirect = ({ to }: RedirectProps) => {
  return <Navigate to={to} replace />;
};

export default Redirect;