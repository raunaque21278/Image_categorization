import { useState }
from "react";

import api
from "../api/axios";

export default function Login() {

  const [email,setEmail] =
    useState("");

  const [password,setPassword] =
    useState("");

  const login = async () => {

    const res =
      await api.post(
        "/auth/login",
        {
          email,
          password
        }
      );

    localStorage.setItem(
      "token",
      res.data.token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(
        res.data.user
      )
    );

    window.location =
      "/dashboard";
  };

  return (
    <div className="p-10">

      <h1>
        Login
      </h1>

      <input
        placeholder="Email"
        onChange={(e)=>
          setEmail(
            e.target.value
          )
        }
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e)=>
          setPassword(
            e.target.value
          )
        }
      />

      <button
        onClick={login}
      >
        Login
      </button>
<button
  onClick={() =>
    window.location = "/signup"
  }
>
  Create Account
</button>
    </div>
  );
}