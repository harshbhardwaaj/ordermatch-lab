from django.core.management.base import BaseCommand

from evals.generation import generate_eval_run


class Command(BaseCommand):
    """Runs the real extraction + hybrid matching pipeline against the
    grounded sample dataset and persists a real (is_simulated=False)
    EvalRun (T122). Deliberately a manual command, not an API endpoint:
    unlike order intake, running an eval is not part of the demo
    experience, and it spends real OpenAI credit on every invocation, so it
    should not be one click away for every visitor.
    """

    help = "Run the real extraction/matching pipeline against the sample dataset and score it."

    def handle(self, *args, **options):
        run = generate_eval_run()
        self.stdout.write(self.style.SUCCESS(f"Eval run {run.id} complete."))
        for metric in run.metrics.all():
            self.stdout.write(f"  {metric.label}: {metric.value} {metric.unit} (n={metric.sample_size})")
        failures = list(run.failure_cases.all())
        if not failures:
            self.stdout.write(self.style.SUCCESS("  no failure cases"))
            return
        self.stdout.write(f"  {len(failures)} failure case(s):")
        for failure in failures:
            self.stdout.write(
                f"    [{failure.severity}] {failure.title} -- expected: {failure.expected!r}, actual: {failure.actual!r}"
            )
