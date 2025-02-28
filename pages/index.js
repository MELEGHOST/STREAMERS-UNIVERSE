const React = require('react');
const { useRouter } = require('next/router');

function Home() {
  const router = useRouter();

  React.useEffect(() => {
    router.push('/auth');
  }, [router]);

  return null;
}

module.exports = Home;
