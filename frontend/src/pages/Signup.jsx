import { useState } from "react";
import api from "../api/axios";

export default function Signup() {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const signup = async () => {
    try {
      const res =
        await api.post(
          "/auth/signup",
          {
            name,
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

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Signup failed"
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center">

      <h1 className="text-5xl font-bold mb-8">
        Signup
      </h1>

      <div className="flex flex-col gap-4 w-80">

        <input
          type="text"
          placeholder="Name"
          className="border p-2 rounded"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <input
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          onClick={signup}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Signup
        </button>

        <button
          onClick={() =>
            window.location = "/"
          }
          className="border p-2 rounded"
        >
          Already have an account?
        </button>

      </div>

    </div>
  );
}