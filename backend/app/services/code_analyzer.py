import ast
import radon.complexity as radon_cc
from radon.metrics import mi_visit
from radon.raw import analyze

def analyze_python_code(code: str) -> dict:
    metrics = {}
    issues = []

    # Raw metrics
    try:
        raw = analyze(code)
        metrics["lines_of_code"] = raw.loc
        metrics["blank_lines"] = raw.blank
        metrics["comment_lines"] = raw.comments
    except Exception:
        pass

    # Cyclomatic complexity
    try:
        complexity_results = radon_cc.cc_visit(code)
        avg_complexity = (
            sum(r.complexity for r in complexity_results) / len(complexity_results)
            if complexity_results else 1
        )
        metrics["avg_complexity"] = round(avg_complexity, 2)

        for result in complexity_results:
            if result.complexity > 10:
                issues.append({
                    "line": result.lineno,
                    "severity": "critical",
                    "message": f"Function '{result.name}' has very high complexity ({result.complexity}). Hard to test and maintain.",
                    "fix": "Break this function into smaller, single-purpose functions."
                })
            elif result.complexity > 5:
                issues.append({
                    "line": result.lineno,
                    "severity": "warning",
                    "message": f"Function '{result.name}' has moderate complexity ({result.complexity}).",
                    "fix": "Consider simplifying the logic or extracting helper functions."
                })
    except Exception:
        pass

    # Maintainability index
    try:
        mi_score = mi_visit(code, multi=True)
        metrics["maintainability_index"] = round(mi_score, 2)
        if mi_score < 20:
            issues.append({
                "line": 0,
                "severity": "critical",
                "message": "Very low maintainability index. Code is very hard to maintain.",
                "fix": "Refactor code into smaller, well-documented functions."
            })
    except Exception:
        pass

    # AST checks
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            # Bare except
            if isinstance(node, ast.ExceptHandler) and node.type is None:
                issues.append({
                    "line": node.lineno,
                    "severity": "warning",
                    "message": "Bare `except:` clause catches all exceptions including system exits.",
                    "fix": "Use `except Exception as e:` or catch specific exceptions."
                })
            # Mutable default arguments
            if isinstance(node, ast.FunctionDef):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        issues.append({
                            "line": node.lineno,
                            "severity": "critical",
                            "message": f"Mutable default argument in function '{node.name}'. This is a common Python bug.",
                            "fix": "Use None as default and set the value inside the function body."
                        })
    except SyntaxError as e:
        issues.append({
            "line": e.lineno or 0,
            "severity": "critical",
            "message": f"Syntax error: {e.msg}",
            "fix": "Fix the syntax error before running a review."
        })

    return {"metrics": metrics, "static_issues": issues}