import {
  useCallback,
  useEffect,
  useState
} from "react";

import api from "../api/axios";
import socket from "../socket/socket";

import UploadForm from "../components/UploadForm";
import JobCard from "../components/JobCard";

export default function Dashboard() {
  const [jobs, setJobs] =
    useState([]);

  const refreshJobs =
    useCallback(async () => {
      try {
        const res =
          await api.get(
            "/jobs"
          );

        setJobs(res.data);
      } catch (error) {
        console.error(
          "Failed to fetch jobs",
          error
        );
      }
    }, []);

  useEffect(() => {
    refreshJobs();

    const userStr =
      localStorage.getItem(
        "user"
      );

    if (!userStr) {
      return;
    }

    const user =
      JSON.parse(userStr);

    const userId =
      String(
        user._id || user.id
      );

    const joinRoom =
      () => {
        socket.emit(
          "join",
          userId
        );
      };

    const onJobCompleted =
      (data) => {
        setJobs((prev) =>
          prev.map((job) =>
            job._id === data.jobId
              ? {
                  ...job,
                  status: data.status,
                  caption: data.caption,
                  labels: data.labels,
                  flagged: data.flagged,
                  flaggedCategory:
                    data.flaggedCategory
                }
              : job
          )
        );

        refreshJobs();
      };

    joinRoom();
    socket.on("connect", joinRoom);
    socket.on(
      "job-completed",
      onJobCompleted
    );

    return () => {
      socket.off("connect", joinRoom);
      socket.off(
        "job-completed",
        onJobCompleted
      );
    };
  }, [refreshJobs]);

  useEffect(() => {
    const hasActiveJobs =
      jobs.some(
        (job) =>
          job.status === "pending" ||
          job.status === "processing"
      );

    if (!hasActiveJobs) {
      return;
    }

    const interval =
      setInterval(
        refreshJobs,
        3000
      );

    return () =>
      clearInterval(interval);
  }, [jobs, refreshJobs]);

  const totalJobs =
    jobs.length;

  const completedJobs =
    jobs.filter(
      (job) =>
        job.status ===
        "completed"
    ).length;

  const flaggedJobs =
    jobs.filter(
      (job) => job.flagged
    ).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      <div className="max-w-6xl mx-auto p-8">

        <h1 className="text-6xl font-bold text-center mb-10">
          AI Media Dashboard
        </h1>

        {/* Stats */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">

            <h3 className="text-gray-400">
              Total Jobs
            </h3>

            <p className="text-4xl font-bold mt-2">
              {totalJobs}
            </p>

          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">

            <h3 className="text-gray-400">
              Completed
            </h3>

            <p className="text-4xl font-bold text-green-500 mt-2">
              {completedJobs}
            </p>

          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">

            <h3 className="text-gray-400">
              Flagged
            </h3>

            <p className="text-4xl font-bold text-red-500 mt-2">
              {flaggedJobs}
            </p>

          </div>

        </div>

        {/* Upload */}

        <UploadForm
          refreshJobs={
            refreshJobs
          }
        />

        {/* Job List */}

        <div className="mt-10">

          {jobs.length === 0 ? (

            <div className="bg-gray-800 p-10 rounded-xl text-center">

              <h2 className="text-xl text-gray-400">
                No jobs uploaded yet
              </h2>

            </div>

          ) : (

            jobs.map(
              (job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  refreshJobs={
                    refreshJobs
                  }
                />
              )
            )

          )}

        </div>

      </div>

    </div>
  );
}
