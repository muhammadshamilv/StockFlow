import { useState } from "react"
import { useNavigate } from "react-router-dom"

import api from "@/api/axios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card,CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function LoginPage(){

    const navigate = useNavigate()

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")

    const login = async() => {
        try{
            const response = await api.post("/api/users/login/",{
                username,
                password
            })
            localStorage.setItem("access", response.data.access)
            localStorage.setItem("refresh", response.data.refresh)
            navigate("/dashboard")
        }catch{
            alert("Login Failed...")
        }
    }

    return(
        <div className="min-h-screen flex items-center justify-center">
            <Card className="w-[400px]">

                <CardHeader>
                    <CardTitle>
                        Login
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div>

                        <Label>
                            Username
                        </Label>

                        <Input value={username} onChange={(e) => setUsername(e.target.value)} />

                    </div>
                    <div>

                        <Label>
                            Password
                        </Label>

                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}  />

                    </div>

                    <Button className="w-full" onClick={login}>
                        Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
export default LoginPage