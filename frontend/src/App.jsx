import Layout from './Layout'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import Founder from './components/Founder'
import Blog from './components/Blog'

export default function App() {
  return (
    <Layout>
      <Hero />
      <Portfolio />
      <Founder />
      <Blog />
    </Layout>
  )
}
