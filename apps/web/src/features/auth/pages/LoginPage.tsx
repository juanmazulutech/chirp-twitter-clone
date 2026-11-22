import { Link } from 'react-router';

import { AuthLayout } from '../components/AuthLayout';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to Chirp"
      footer={
        <>
          New to Chirp?{' '}
          <Link to="/register" className="font-medium text-airmail-blue underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
