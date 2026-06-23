import api from "@/api/axios"

import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function RegisterPage(){

    const navigate = useNavigate()

    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const register = async() => {
        try{
            const response = await api.post("/api/users/register/", {
                username,
                email,
                password
            })
            console.log(response.data)
            alert("Registration Successfull...")
            navigate("/")
        }catch(error){
            console.log(error)
            alert("Registration Failed...")
        }
    }

    return(
        <div className="min-h-screen flex items-center justify-center">

            <Card className="w-[400px]">

                <CardHeader>
                    <CardTitle>
                        Register
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
                            Email
                        </Label>

                        <Input value={email} onChange={(e) => setEmail(e.target.value)} />

                    </div>
                    <div>

                        <Label>
                            Password
                        </Label>

                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

                    </div>

                    <Button className="w-full" onClick={register}>
                        Register
                    </Button>

                </CardContent>
            </Card>
        </div>
    )

}
export default RegisterPage