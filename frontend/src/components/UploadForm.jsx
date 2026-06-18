import { useState } from "react";
import api from "../api/axios";

export default function UploadForm({
  refreshJobs
}) {

  const [file, setFile] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const upload = async () => {

    if (!file) return;

    const formData =
      new FormData();

    formData.append(
      "image",
      file
    );

    setLoading(true);

    await api.post(
      "/jobs/upload",
      formData
    );

    setLoading(false);

    refreshJobs();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">

      <div className="flex gap-4 items-center">

        <input
          type="file"
          onChange={(e) =>
            setFile(
              e.target.files[0]
            )
          }
          className="text-white"
        />

        <button
          onClick={upload}
          disabled={loading}
          className="
            bg-blue-600
            hover:bg-blue-700
            px-5
            py-2
            rounded-lg
            font-semibold
          "
        >
          {loading
            ? "Uploading..."
            : "Upload"}
        </button>

      </div>

    </div>
  );
}