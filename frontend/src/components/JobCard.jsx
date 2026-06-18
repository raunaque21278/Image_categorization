import api from "../api/axios";

const assetsBase =
  import.meta.env.VITE_ASSETS_URL ||
  "http://localhost:5000";

export default function JobCard({
  job,
  refreshJobs
}) {
  const shortCaption =
    job.caption?.length > 300
      ? job.caption.slice(0, 300) + "..."
      : job.caption;

  const imageSrc =
    job.imageUrl?.startsWith("http")
      ? job.imageUrl
      : assetsBase
        ? `${assetsBase}/${job.imageUrl}`
        : `/${job.imageUrl}`;

  const retryJob =
    async () => {
      await api.post(
        `/retry/${job._id}`
      );

      refreshJobs();
    };

  return (
    <div
      className={`
        max-w-4xl
        mx-auto
        bg-gray-800
        rounded-2xl
        shadow-xl
        border
        p-6
        mb-8
        ${job.flagged
          ? "border-red-500"
          : "border-gray-700"}
      `}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          Job Result
          {job.flagged && (
            <span className="ml-3 text-sm text-red-400">
              FLAGGED
            </span>
          )}
        </h2>

        <div className="flex gap-2 items-center">
          {job.status === "failed" && (
            <button
              onClick={retryJob}
              className="
                bg-orange-600
                hover:bg-orange-700
                px-4
                py-2
                rounded-lg
                text-sm
                font-semibold
              "
            >
              Retry
            </button>
          )}

          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              job.status === "completed"
                ? "bg-green-500 text-white"
                : job.status === "processing"
                ? "bg-yellow-500 text-black"
                : job.status === "failed"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            {job.status}
          </span>
        </div>
      </div>

      {job.imageUrl && (
        <div className="flex justify-center mb-6">
          <img
            src={imageSrc}
            alt="Uploaded"
            style={{
              width: "400px",
              height: "250px",
              objectFit: "cover",
              borderRadius: "12px"
            }}
          />
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-white">
          Caption
        </h3>

        <div
          className="
            bg-gray-900
            rounded-lg
            p-4
            text-gray-300
            leading-relaxed
          "
        >
          {shortCaption || "No caption generated"}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-white">
          Labels
        </h3>

        <div className="flex flex-wrap gap-2">
          {job.labels?.length > 0 ? (
            job.labels.map((label) => (
              <span
                key={label}
                className="
                  bg-blue-600
                  text-white
                  px-3
                  py-1
                  rounded-full
                  text-sm
                "
              >
                {label}
              </span>
            ))
          ) : (
            <span className="text-gray-400">
              No labels detected
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-white">
          Safety Check
        </h3>

        {job.flagged ? (
          <div
            className="
              bg-red-900/30
              border
              border-red-500
              text-red-400
              rounded-lg
              p-3
              font-semibold
            "
          >
            Unsafe Content
            {job.flaggedCategory &&
              ` (${job.flaggedCategory})`}
          </div>
        ) : (
          <div
            className="
              bg-green-900/30
              border
              border-green-500
              text-green-400
              rounded-lg
              p-3
              font-semibold
            "
          >
            Safe Content
          </div>
        )}
      </div>
    </div>
  );
}
