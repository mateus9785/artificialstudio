import Layout from './Layout'
import Hero from './components/Hero'
import Founder from './components/Founder'
import Blog from './components/Blog'

export default function App() {
  return (
    <Layout>
      <Hero />
      <Founder />
      <Blog />
    </Layout>
  )
}
