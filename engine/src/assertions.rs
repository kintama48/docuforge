use crate::error::EngineError;

pub fn ensure(condition: bool, message: impl Into<String>) -> Result<(), EngineError> {
    if condition {
        return Ok(());
    }

    Err(EngineError::Internal(format!(
        "Assertion failed: {}",
        message.into()
    )))
}

pub fn ensure_opt<T>(
    value: Option<T>,
    message: impl Into<String>,
) -> Result<T, EngineError> {
    value.ok_or_else(|| EngineError::Internal(format!("Assertion failed: {}", message.into())))
}

pub fn ensure_result<T, E: std::fmt::Display>(
    result: Result<T, E>,
    message: impl Into<String>,
) -> Result<T, EngineError> {
    result.map_err(|err| EngineError::Internal(format!("{}: {}", message.into(), err)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_returns_ok_for_true_condition() {
        let result = ensure(true, "should pass");
        assert!(result.is_ok());
    }

    #[test]
    fn ensure_returns_internal_error_for_false_condition() {
        let result = ensure(false, "should fail");
        assert!(matches!(result, Err(EngineError::Internal(_))));
    }

    #[test]
    fn ensure_opt_returns_value() {
        let result = ensure_opt(Some(123), "missing value");
        assert_eq!(result.unwrap_or_default(), 123);
    }

    #[test]
    fn ensure_result_maps_errors() {
        let result: Result<i32, EngineError> = ensure_result::<i32, &str>(Err("boom"), "failed");
        assert!(matches!(result, Err(EngineError::Internal(_))));
    }
}
