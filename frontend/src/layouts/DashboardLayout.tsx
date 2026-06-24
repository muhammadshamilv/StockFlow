import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Sidebar from "@/components/Sidebar"

type Props = {
    children: React.ReactNode
}

function DashboardLayout({ children }: Props){

    return(
        <div className="min-h-screen flex flex-col">
            
            <Navbar />

            <div className="flex flex-1">

                <Sidebar />

                <main className="flex-1 p-8">
                    {children}
                </main>

            </div>
            <Footer />
        </div>
    )
}
export default DashboardLayout