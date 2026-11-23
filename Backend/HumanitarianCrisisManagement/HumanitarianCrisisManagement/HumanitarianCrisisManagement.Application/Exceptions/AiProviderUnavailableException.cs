namespace HumanitarianCrisisManagement.Application.Exceptions;

public class AiProviderUnavailableException : Exception
{
    public AiProviderUnavailableException(string message)
        : base(message)
    {
    }

    public AiProviderUnavailableException(string message, Exception? innerException)
        : base(message, innerException)
    {
    }
}
