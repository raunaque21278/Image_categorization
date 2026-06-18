const Job =
  require("../models/Job");

const findById =
  async (id) =>
    Job.findById(id);

const save =
  async (job) =>
    job.save();

module.exports = {
  findById,
  save
};