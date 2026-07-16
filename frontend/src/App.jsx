import Layout from './Layout'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import Blog from './components/Blog'

export default function App() {
  return (
    <Layout>
      <Hero />
      <Portfolio />
      <Blog />
    </Layout>
  )
}
